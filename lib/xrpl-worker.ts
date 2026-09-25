import "server-only"
import { and, asc, eq, inArray, lt, lte, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  xrplTransactionQueue,
  xrplTransactions,
  xrplAnchors,
  governanceVotes,
  electionParticipation,
} from "@/lib/db/schema"
import { submitMemo } from "@/lib/xrpl"

const MEMO_TYPES: Record<string, string> = {
  vote: "VAAP-VOTE",
  result_anchor: "VAAP-RESULT",
  election_participation: "VAAP-ELECTION",
}

/** A job stuck in "processing" this long (e.g. the function was killed) is eligible again. */
const STALE_PROCESSING_MS = 10 * 60_000

export type ProcessedJob = { id: number; status: string; txHash?: string; error?: string }

/** Atomically take ownership of a job so concurrent runs never submit it twice. */
async function claimJob(id: number): Promise<boolean> {
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS)
  const claimed = await db
    .update(xrplTransactionQueue)
    .set({
      status: "processing",
      attempts: sql`${xrplTransactionQueue.attempts} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(xrplTransactionQueue.id, id),
        or(
          inArray(xrplTransactionQueue.status, ["pending", "failed"]),
          and(eq(xrplTransactionQueue.status, "processing"), lt(xrplTransactionQueue.updatedAt, staleBefore)),
        ),
      ),
    )
    .returning({ id: xrplTransactionQueue.id })
  return claimed.length > 0
}

async function markDomainVerified(jobType: string, refId: number, txHash: string) {
  if (jobType === "vote") {
    await db.update(governanceVotes).set({ xrplStatus: "verified" }).where(eq(governanceVotes.id, refId))
  } else if (jobType === "election_participation") {
    await db.update(electionParticipation).set({ xrplStatus: "verified" }).where(eq(electionParticipation.id, refId))
  } else if (jobType === "result_anchor") {
    await db
      .update(xrplAnchors)
      .set({ status: "verified", txHash, anchoredAt: new Date() })
      .where(and(eq(xrplAnchors.refId, refId), eq(xrplAnchors.status, "pending")))
  }
}

/**
 * Submit due XRPL jobs and record validated results. Failures are retried with
 * backoff; after maxAttempts the job is parked as "failed" for admin review.
 */
export async function drainXrplQueue(batch = 5): Promise<{ processed: ProcessedJob[]; remaining: boolean }> {
  const now = new Date()
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS)
  const jobs = await db
    .select()
    .from(xrplTransactionQueue)
    .where(
      and(
        lt(xrplTransactionQueue.attempts, xrplTransactionQueue.maxAttempts),
        or(
          and(inArray(xrplTransactionQueue.status, ["pending", "failed"]), lte(xrplTransactionQueue.nextRunAt, now)),
          and(eq(xrplTransactionQueue.status, "processing"), lt(xrplTransactionQueue.updatedAt, staleBefore)),
        ),
      ),
    )
    .orderBy(asc(xrplTransactionQueue.createdAt))
    .limit(batch)

  const processed: ProcessedJob[] = []

  for (const job of jobs) {
    if (!(await claimJob(job.id))) continue
    const attempt = job.attempts + 1

    let payload: Record<string, unknown> = {}
    try {
      payload = JSON.parse(job.payload || "{}")
    } catch {
      payload = {}
    }
    const memoData = String(payload.receiptHash ?? payload.resultHash ?? job.payloadHash)
    const memoType = MEMO_TYPES[job.jobType] ?? "VAAP-GOV"

    try {
      const result = await submitMemo(memoType, `${job.refTable}:${job.refId}:${memoData}`)

      await db.insert(xrplTransactions).values({
        queueId: job.id,
        jobType: job.jobType,
        refTable: job.refTable,
        refId: job.refId,
        network: result.network,
        txHash: result.hash,
        ledgerIndex: result.ledgerIndex,
        account: result.account,
        memoHash: memoData,
        status: "verified",
        validatedAt: new Date(),
        rawResult: result.rawResult,
      })
      await markDomainVerified(job.jobType, job.refId, result.hash)
      await db
        .update(xrplTransactionQueue)
        .set({ status: "verified", lastError: "", updatedAt: new Date() })
        .where(eq(xrplTransactionQueue.id, job.id))
      processed.push({ id: job.id, status: "verified", txHash: result.hash })
    } catch (e) {
      const message = (e as Error).message.slice(0, 500)
      const exhausted = attempt >= job.maxAttempts
      const nextRunAt = new Date(Date.now() + Math.min(15 * 60_000, 30_000 * 2 ** (attempt - 1)))
      await db
        .update(xrplTransactionQueue)
        .set({ status: exhausted ? "failed" : "pending", lastError: message, nextRunAt, updatedAt: new Date() })
        .where(eq(xrplTransactionQueue.id, job.id))
      console.error(`[xrpl-worker] job ${job.id} failed (attempt ${attempt}):`, message)
      processed.push({ id: job.id, status: exhausted ? "failed" : "retrying", error: message })
    }
  }

  return { processed, remaining: jobs.length === batch }
}

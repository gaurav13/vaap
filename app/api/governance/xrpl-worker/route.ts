import { NextResponse } from "next/server"
import { and, asc, eq, inArray, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession, isStaff } from "@/lib/session"
import {
  xrplTransactionQueue,
  xrplTransactions,
  xrplAnchors,
  governanceVotes,
  electionParticipation,
} from "@/lib/db/schema"
import { submitMemo, XRPL_NETWORK } from "@/lib/xrpl"

export const runtime = "nodejs"
export const maxDuration = 60

const MEMO_TYPES: Record<string, string> = {
  vote: "VAAP-VOTE",
  result_anchor: "VAAP-RESULT",
  election_participation: "VAAP-ELECTION",
}

const BATCH = 5

/**
 * Drains pending XRPL jobs: submits a memo transaction to the XRPL testnet for
 * each and records the validated result. Auth: staff/admin session, or an
 * `x-worker-key` header matching BETTER_AUTH_SECRET (for cron automation).
 */
export async function POST(req: Request) {
  const workerKey = req.headers.get("x-worker-key")
  const authorized =
    (workerKey && workerKey === process.env.BETTER_AUTH_SECRET) ||
    (await getSession().then((s) => s?.user && isStaff(s.user.role)).catch(() => false))
  if (!authorized) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const jobs = await db
    .select()
    .from(xrplTransactionQueue)
    .where(
      and(
        inArray(xrplTransactionQueue.status, ["pending", "failed"]),
        lte(xrplTransactionQueue.nextRunAt, now),
      ),
    )
    .orderBy(asc(xrplTransactionQueue.createdAt))
    .limit(BATCH)

  const processed: Array<{ id: number; status: string; txHash?: string; error?: string }> = []

  for (const job of jobs) {
    if (job.attempts >= job.maxAttempts) {
      await db.update(xrplTransactionQueue).set({ status: "failed" }).where(eq(xrplTransactionQueue.id, job.id))
      processed.push({ id: job.id, status: "max_attempts" })
      continue
    }

    await db
      .update(xrplTransactionQueue)
      .set({ status: "processing", attempts: job.attempts + 1, updatedAt: new Date() })
      .where(eq(xrplTransactionQueue.id, job.id))

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
        network: XRPL_NETWORK,
        txHash: result.hash,
        ledgerIndex: result.ledgerIndex,
        account: result.account,
        memoHash: memoData,
        status: "verified",
        validatedAt: new Date(),
        rawResult: result.rawResult,
      })

      // Reflect the verified anchor onto the domain record.
      if (job.jobType === "vote") {
        await db.update(governanceVotes).set({ xrplStatus: "verified" }).where(eq(governanceVotes.id, job.refId))
      } else if (job.jobType === "election_participation") {
        await db
          .update(electionParticipation)
          .set({ xrplStatus: "verified" })
          .where(eq(electionParticipation.id, job.refId))
      } else if (job.jobType === "result_anchor") {
        await db
          .update(xrplAnchors)
          .set({ status: "verified", txHash: result.hash, anchoredAt: new Date() })
          .where(and(eq(xrplAnchors.refId, job.refId), eq(xrplAnchors.status, "pending")))
      }

      await db
        .update(xrplTransactionQueue)
        .set({ status: "verified", updatedAt: new Date() })
        .where(eq(xrplTransactionQueue.id, job.id))
      processed.push({ id: job.id, status: "verified", txHash: result.hash })
    } catch (e) {
      const message = (e as Error).message.slice(0, 500)
      // Exponential-ish backoff before the next attempt.
      const nextRunAt = new Date(Date.now() + Math.min(60_000, 5_000 * (job.attempts + 1)))
      await db
        .update(xrplTransactionQueue)
        .set({ status: "pending", lastError: message, nextRunAt, updatedAt: new Date() })
        .where(eq(xrplTransactionQueue.id, job.id))
      console.log("[v0] xrpl-worker job failed:", job.id, message)
      processed.push({ id: job.id, status: "error", error: message })
    }
  }

  return NextResponse.json({ ok: true, processed, remaining: jobs.length === BATCH })
}

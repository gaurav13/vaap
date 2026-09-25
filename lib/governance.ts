import "server-only"
import crypto from "crypto"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  members,
  governancePublicIds,
  governanceMemberPermissions,
  governanceProposals,
  governanceProposalOptions,
  governanceProposalEligibility,
  governanceVotes,
  governanceVoteVersions,
  governanceVoteReceipts,
  governanceResults,
  governanceAuditLogs,
  xrplTransactionQueue,
  xrplTransactions,
  xrplAnchors,
} from "@/lib/db/schema"
import { sha256Hex } from "@/lib/xrpl"
import { approvedGovernanceMemberIds } from "@/lib/voting-rights"

export type ProposalRow = typeof governanceProposals.$inferSelect
export type VoteRow = typeof governanceVotes.$inferSelect

// ---------------------------------------------------------------------------
// Identity helpers
// ---------------------------------------------------------------------------

/** Resolve the member row backing a Better Auth user id. */
export async function getMemberByUserId(userId: string) {
  const rows = await db.select().from(members).where(eq(members.userId, userId)).limit(1)
  return rows[0] ?? null
}

/** Get or lazily create a stable public governance ID for a member. */
export async function ensurePublicId(memberId: number): Promise<string> {
  const existing = await db
    .select()
    .from(governancePublicIds)
    .where(eq(governancePublicIds.memberId, memberId))
    .limit(1)
  if (existing[0]) return existing[0].publicId

  // VAAP-G-XXXXXX — short, stable, non-guessable-ish public handle.
  const publicId = `VAAP-G-${crypto.randomBytes(4).toString("hex").toUpperCase()}`
  await db.insert(governancePublicIds).values({ memberId, publicId })
  return publicId
}

export async function getMemberPermissions(memberId: number) {
  const rows = await db
    .select()
    .from(governanceMemberPermissions)
    .where(eq(governanceMemberPermissions.memberId, memberId))
    .limit(1)
  return (
    rows[0] ?? {
      memberId,
      canPropose: false,
      canVote: true,
      isElectionOfficer: false,
      note: "",
    }
  )
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export async function logGovernance(entry: {
  actorId?: string | null
  actorName?: string
  actorRole?: string
  action: string
  entityType?: string
  entityId?: string | number
  detail?: unknown
  ipAddress?: string
}) {
  await db.insert(governanceAuditLogs).values({
    actorId: entry.actorId ?? null,
    actorName: entry.actorName ?? "",
    actorRole: entry.actorRole ?? "",
    action: entry.action,
    entityType: entry.entityType ?? "",
    entityId: entry.entityId != null ? String(entry.entityId) : "",
    detail: entry.detail ? JSON.stringify(entry.detail).slice(0, 4000) : "",
    ipAddress: entry.ipAddress ?? "",
  })
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export async function listProposals(opts?: { statuses?: string[] }) {
  const rows = opts?.statuses?.length
    ? await db
        .select()
        .from(governanceProposals)
        .where(inArray(governanceProposals.status, opts.statuses))
        .orderBy(desc(governanceProposals.createdAt))
    : await db.select().from(governanceProposals).orderBy(desc(governanceProposals.createdAt))
  return rows
}

export async function getProposal(id: number) {
  const rows = await db.select().from(governanceProposals).where(eq(governanceProposals.id, id)).limit(1)
  const proposal = rows[0]
  if (!proposal) return null
  const options = await db
    .select()
    .from(governanceProposalOptions)
    .where(eq(governanceProposalOptions.proposalId, id))
    .orderBy(governanceProposalOptions.sortOrder)
  return { proposal, options }
}

export async function getProposalByReference(reference: string) {
  const rows = await db
    .select()
    .from(governanceProposals)
    .where(eq(governanceProposals.reference, reference))
    .limit(1)
  return rows[0] ?? null
}

function makeReference(prefix: string) {
  const year = new Date().getFullYear()
  return `${prefix}-${year}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`
}

export async function createProposal(input: {
  title: string
  summary?: string
  description?: string
  category?: string
  voteType?: string
  visibility?: string
  eligibilityMode?: string
  eligibleCategory?: string
  quorum?: number
  passThreshold?: number
  recordIndividualVotesOnXrpl?: boolean
  anchorResultOnXrpl?: boolean
  options?: string[]
  selectedMemberIds?: number[]
  createdById?: string | null
  createdByName?: string
  opensAt?: Date | null
  closesAt?: Date | null
  bannerImageUrl?: string
  bannerAlt?: string
}) {
  const [proposal] = await db
    .insert(governanceProposals)
    .values({
      bannerImageUrl: input.bannerImageUrl ?? "",
      bannerAlt: input.bannerAlt ?? "",
      opensAt: input.opensAt ?? null,
      closesAt: input.closesAt ?? null,
      reference: makeReference("VAAP-RES"),
      title: input.title,
      summary: input.summary ?? "",
      description: input.description ?? "",
      category: input.category ?? "Resolution",
      voteType: input.voteType ?? "yes_no_abstain",
      visibility: input.visibility ?? "open",
      eligibilityMode: input.eligibilityMode ?? "all_voting_members",
      eligibleCategory: input.eligibleCategory ?? "",
      quorum: input.quorum ?? 0,
      passThreshold: input.passThreshold ?? 50,
      recordIndividualVotesOnXrpl: input.recordIndividualVotesOnXrpl ?? false,
      anchorResultOnXrpl: input.anchorResultOnXrpl ?? true,
      status: "draft",
      createdById: input.createdById ?? null,
      createdByName: input.createdByName ?? "",
    })
    .returning()

  if (input.voteType && input.voteType !== "yes_no_abstain" && input.options?.length) {
    await db.insert(governanceProposalOptions).values(
      input.options
        .map((label) => label.trim())
        .filter(Boolean)
        .map((label, i) => ({ proposalId: proposal.id, label, sortOrder: i })),
    )
  }

  if (input.eligibilityMode === "selected_members" && input.selectedMemberIds?.length) {
    await db.insert(governanceProposalEligibility).values(
      input.selectedMemberIds.map((memberId) => ({ proposalId: proposal.id, memberId })),
    )
  }

  return proposal
}

export async function setProposalStatus(id: number, status: string) {
  const patch: Partial<ProposalRow> = { status, updatedAt: new Date() }
  if (status === "published") patch.publishedAt = new Date()
  if (status === "active") {
    const [current] = await db
      .select({ opensAt: governanceProposals.opensAt })
      .from(governanceProposals)
      .where(eq(governanceProposals.id, id))
    if (!current?.opensAt || current.opensAt.getTime() > Date.now()) patch.opensAt = new Date()
  }
  if (status === "closed") patch.closedAt = new Date()
  await db.update(governanceProposals).set(patch).where(eq(governanceProposals.id, id))
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

/** Return the member ids eligible to vote on a proposal. */
export async function eligibleMemberIds(proposal: ProposalRow): Promise<number[]> {
  // A member may only vote on governance proposals when a super-admin has
  // APPROVED their governance voting right (independent of the election right).
  const approved = new Set(await approvedGovernanceMemberIds())

  if (proposal.eligibilityMode === "selected_members") {
    const rows = await db
      .select({ memberId: governanceProposalEligibility.memberId })
      .from(governanceProposalEligibility)
      .where(eq(governanceProposalEligibility.proposalId, proposal.id))
    return rows.map((r) => r.memberId).filter((id) => approved.has(id))
  }

  const base = eq(members.status, "active")
  const where =
    proposal.eligibilityMode === "category" && proposal.eligibleCategory
      ? and(base, eq(members.category, proposal.eligibleCategory))
      : base

  const rows = await db.select({ id: members.id }).from(members).where(where)
  return rows.map((r) => r.id).filter((id) => approved.has(id))
}

export async function isMemberEligible(proposal: ProposalRow, memberId: number): Promise<boolean> {
  const ids = await eligibleMemberIds(proposal)
  return ids.includes(memberId)
}

// ---------------------------------------------------------------------------
// XRPL queue
// ---------------------------------------------------------------------------

export async function enqueueXrplJob(job: {
  jobType: string
  refTable: string
  refId: number
  payload: unknown
}) {
  const payloadStr = JSON.stringify(job.payload)
  const payloadHash = sha256Hex(payloadStr)
  const idempotencyKey = sha256Hex(`${job.jobType}:${job.refTable}:${job.refId}:${payloadHash}`)
  await db
    .insert(xrplTransactionQueue)
    .values({
      jobType: job.jobType,
      refTable: job.refTable,
      refId: job.refId,
      payload: payloadStr.slice(0, 8000),
      payloadHash,
      idempotencyKey,
    })
    .onConflictDoNothing({ target: xrplTransactionQueue.idempotencyKey })
}

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------

export async function getMemberVote(proposalId: number, memberId: number) {
  const rows = await db
    .select()
    .from(governanceVotes)
    .where(
      and(
        eq(governanceVotes.proposalId, proposalId),
        eq(governanceVotes.memberId, memberId),
        eq(governanceVotes.isActive, true),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export type CastVoteInput = {
  proposal: ProposalRow
  memberId: number
  choice: string // yes | no | abstain | option
  optionId?: number | null
}

/**
 * Cast or replace a member's vote. Re-voting supersedes the prior active vote
 * (kept as an immutable version) and issues a fresh receipt. Enforces
 * one-active-vote-per-member. Returns the new vote row + receipt code.
 */
export async function castVote(input: CastVoteInput) {
  const { proposal, memberId } = input
  const existing = await getMemberVote(proposal.id, memberId)
  const version = existing ? existing.version + 1 : 1

  if (existing) {
    // Archive the prior vote as a version and deactivate it.
    await db.insert(governanceVoteVersions).values({
      voteId: existing.id,
      proposalId: proposal.id,
      memberId,
      choice: existing.choice,
      optionId: existing.optionId ?? null,
      version: existing.version,
    })
    await db.update(governanceVotes).set({ isActive: false }).where(eq(governanceVotes.id, existing.id))
  }

  const receiptCode = `VR-${crypto.randomBytes(6).toString("hex").toUpperCase()}`
  const xrplStatus = proposal.recordIndividualVotesOnXrpl ? "pending" : "not_recorded"

  const [vote] = await db
    .insert(governanceVotes)
    .values({
      proposalId: proposal.id,
      memberId,
      choice: input.choice,
      optionId: input.optionId ?? null,
      receiptCode,
      isActive: true,
      version,
      xrplStatus,
    })
    .returning()

  const receiptHash = sha256Hex(`${receiptCode}:${proposal.id}:${memberId}:${input.choice}:${version}`)
  await db.insert(governanceVoteReceipts).values({
    voteId: vote.id,
    proposalId: proposal.id,
    memberId,
    receiptCode,
    receiptHash,
  })

  if (proposal.recordIndividualVotesOnXrpl) {
    await enqueueXrplJob({
      jobType: "vote",
      refTable: "governance_votes",
      refId: vote.id,
      payload: { receiptHash, proposalRef: proposal.reference, version },
    })
  }

  return { vote, receiptCode, receiptHash }
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** Tally active votes for a proposal and persist a governance_results row. */
export async function computeProposalResult(proposalId: number) {
  const data = await getProposal(proposalId)
  if (!data) throw new Error("Proposal not found")
  const { proposal, options } = data

  const eligible = await eligibleMemberIds(proposal)
  const eligibleCount = eligible.length

  const votes = await db
    .select()
    .from(governanceVotes)
    .where(and(eq(governanceVotes.proposalId, proposalId), eq(governanceVotes.isActive, true)))

  const totalVotes = votes.length
  let yesCount = 0
  let noCount = 0
  let abstainCount = 0
  const optionTally: Record<string, number> = {}
  for (const o of options) optionTally[String(o.id)] = 0

  for (const v of votes) {
    if (v.choice === "yes") yesCount++
    else if (v.choice === "no") noCount++
    else if (v.choice === "abstain") abstainCount++
    else if (v.choice === "option" && v.optionId != null) {
      optionTally[String(v.optionId)] = (optionTally[String(v.optionId)] ?? 0) + 1
    }
  }

  // Outcome: quorum first (share of eligible who cast any vote), then threshold
  // (yes as a share of decisive yes+no votes for yes/no proposals).
  let outcome: string = "pending"
  const quorumMet = proposal.quorum <= 0 || (eligibleCount > 0 && (totalVotes / eligibleCount) * 100 >= proposal.quorum)
  if (!quorumMet) {
    outcome = "no_quorum"
  } else if (proposal.voteType === "yes_no_abstain") {
    const decisive = yesCount + noCount
    const yesShare = decisive > 0 ? (yesCount / decisive) * 100 : 0
    outcome = yesShare >= proposal.passThreshold ? "passed" : "failed"
  } else {
    outcome = totalVotes > 0 ? "passed" : "failed"
  }

  const resultHash = sha256Hex(
    JSON.stringify({
      proposalRef: proposal.reference,
      eligibleCount,
      totalVotes,
      yesCount,
      noCount,
      abstainCount,
      optionTally,
      outcome,
    }),
  )

  // Upsert single result row per proposal.
  const existing = await db
    .select()
    .from(governanceResults)
    .where(eq(governanceResults.proposalId, proposalId))
    .limit(1)

  const values = {
    proposalId,
    eligibleCount,
    totalVotes,
    yesCount,
    noCount,
    abstainCount,
    optionTally: JSON.stringify(optionTally),
    outcome,
    resultHash,
    computedAt: new Date(),
  }

  if (existing[0]) {
    await db.update(governanceResults).set(values).where(eq(governanceResults.id, existing[0].id))
  } else {
    await db.insert(governanceResults).values(values)
  }

  return { ...values, optionTally }
}

export async function getProposalResult(proposalId: number) {
  const rows = await db
    .select()
    .from(governanceResults)
    .where(eq(governanceResults.proposalId, proposalId))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Public receipt verification. Returns only non-identifying facts: which
 * proposal the receipt belongs to, when it was cast, and its XRPL anchor
 * status. Never exposes the member behind the receipt.
 */
export async function verifyReceipt(code: string) {
  const clean = code.trim().toUpperCase()
  if (!clean) return null
  const [row] = await db
    .select({
      id: governanceVotes.id,
      receiptCode: governanceVotes.receiptCode,
      castAt: governanceVotes.castAt,
      xrplStatus: governanceVotes.xrplStatus,
      isActive: governanceVotes.isActive,
      proposalId: governanceVotes.proposalId,
    })
    .from(governanceVotes)
    .where(eq(governanceVotes.receiptCode, clean))
    .limit(1)
  if (!row) return null
  // The on-ledger tx hash (if any) lives in the xrpl_transactions table, keyed
  // by the vote row. Only a validated transaction has a hash.
  const [tx] = await db
    .select({ txHash: xrplTransactions.txHash, status: xrplTransactions.status })
    .from(xrplTransactions)
    .where(and(eq(xrplTransactions.refTable, "governance_votes"), eq(xrplTransactions.refId, row.id)))
    .orderBy(desc(xrplTransactions.id))
    .limit(1)
  const vote = { ...row, xrplTxHash: tx?.txHash ?? null }
  const [proposal] = await db
    .select({ title: governanceProposals.title, reference: governanceProposals.reference, status: governanceProposals.status })
    .from(governanceProposals)
    .where(eq(governanceProposals.id, row.proposalId))
    .limit(1)
  return { vote, proposal: proposal ?? null }
}

/**
 * Returns the XRPL result anchor for a proposal, if one exists. The tx hash is
 * only present once the anchor transaction has been validated on-ledger.
 */
export async function getProposalAnchor(proposalId: number) {
  const [anchor] = await db
    .select()
    .from(xrplAnchors)
    .where(and(eq(xrplAnchors.anchorType, "proposal_result"), eq(xrplAnchors.refId, proposalId)))
    .orderBy(desc(xrplAnchors.id))
    .limit(1)
  return anchor ?? null
}

/** Count of ACTIVE ballots cast, for live open-vote displays. */
export async function proposalVoteCount(proposalId: number) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(governanceVotes)
    .where(and(eq(governanceVotes.proposalId, proposalId), eq(governanceVotes.isActive, true)))
  return row?.n ?? 0
}

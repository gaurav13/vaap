import "server-only"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  members,
  governanceProposals,
  governanceVotes,
  governanceResults,
  governancePublicIds,
  elections,
  xrplTransactions,
} from "@/lib/db/schema"
import {
  eligibleMemberIds,
  getProposalResult,
  getProposalAnchor,
  type ProposalRow,
} from "@/lib/governance"
import { approvedGovernanceMemberIds } from "@/lib/voting-rights"

// ---------------------------------------------------------------------------
// Everything here is safe to render on the PUBLIC website with no session.
// It returns aggregate, non-identifying data unless a proposal's per-proposal
// visibility flags explicitly permit more.
// ---------------------------------------------------------------------------

export type GovernanceStats = {
  activeVotes: number
  eligibleMembers: number
  totalVotesCast: number
  activeElections: number
  xrplVerifiedRecords: number
}

/** Live governance statistics for the public hub. All values from the DB. */
export async function getGovernanceStats(): Promise<GovernanceStats> {
  const [activeVotes, eligible, totalVotes, activeElections, xrplVerified] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(governanceProposals)
      .where(eq(governanceProposals.status, "active")),
    approvedGovernanceMemberIds(),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(governanceVotes)
      .where(eq(governanceVotes.isActive, true)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(elections)
      .where(eq(elections.status, "active")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(xrplTransactions)
      .where(eq(xrplTransactions.status, "validated")),
  ])

  return {
    activeVotes: activeVotes[0]?.n ?? 0,
    eligibleMembers: eligible.length,
    totalVotesCast: totalVotes[0]?.n ?? 0,
    activeElections: activeElections[0]?.n ?? 0,
    xrplVerifiedRecords: xrplVerified[0]?.n ?? 0,
  }
}

export type PublicProposalCard = {
  proposal: ProposalRow
  eligibleCount: number
  voteCount: number
  remaining: number
  turnout: number
}

/** Vote count + eligibility for a batch of proposals (efficient, public-safe). */
async function proposalCounts(proposals: ProposalRow[]): Promise<Map<number, { voteCount: number }>> {
  const map = new Map<number, { voteCount: number }>()
  if (proposals.length === 0) return map
  const ids = proposals.map((p) => p.id)
  const rows = await db
    .select({ proposalId: governanceVotes.proposalId, n: sql<number>`count(*)::int` })
    .from(governanceVotes)
    .where(and(inArray(governanceVotes.proposalId, ids), eq(governanceVotes.isActive, true)))
    .groupBy(governanceVotes.proposalId)
  for (const r of rows) map.set(r.proposalId, { voteCount: r.n })
  return map
}

/** Build public cards for a set of proposals, with turnout math. */
export async function buildProposalCards(proposals: ProposalRow[]): Promise<PublicProposalCard[]> {
  const counts = await proposalCounts(proposals)
  const cards = await Promise.all(
    proposals.map(async (proposal) => {
      const eligible = await eligibleMemberIds(proposal)
      const eligibleCount = eligible.length
      const voteCount = counts.get(proposal.id)?.voteCount ?? 0
      const remaining = Math.max(eligibleCount - voteCount, 0)
      const turnout = eligibleCount > 0 ? (voteCount / eligibleCount) * 100 : 0
      return { proposal, eligibleCount, voteCount, remaining, turnout }
    }),
  )
  return cards
}

/** Public proposals grouped for the hub: open / upcoming / completed. */
export async function getPublicProposalGroups() {
  const all = await db
    .select()
    .from(governanceProposals)
    .where(inArray(governanceProposals.status, ["active", "published", "closed", "results_published", "archived"]))
    .orderBy(desc(governanceProposals.createdAt))

  const open = all.filter((p) => p.status === "active")
  const upcoming = all.filter((p) => p.status === "published")
  const completed = all.filter((p) => ["closed", "results_published", "archived"].includes(p.status))

  const [openCards, upcomingCards, completedCards] = await Promise.all([
    buildProposalCards(open),
    buildProposalCards(upcoming),
    buildProposalCards(completed),
  ])
  return { open: openCards, upcoming: upcomingCards, completed: completedCards }
}

/** All publicly listable proposals as flat cards (for the proposals index + filters). */
export async function getPublicProposalList(): Promise<PublicProposalCard[]> {
  const rows = await db
    .select()
    .from(governanceProposals)
    .where(inArray(governanceProposals.status, ["active", "published", "closed", "results_published", "archived"]))
    .orderBy(desc(governanceProposals.createdAt))
  return buildProposalCards(rows)
}

export type PublicProposalDetail = {
  proposal: ProposalRow
  eligibleCount: number
  voteCount: number
  remaining: number
  turnout: number
  result: Awaited<ReturnType<typeof getProposalResult>>
  optionTally: Record<string, number>
  anchorHash: string | null
  showResults: boolean
  showLiveResults: boolean
}

/**
 * Full public view of one proposal. Results are only included when the
 * proposal has closed OR the super-admin enabled live results.
 */
export async function getPublicProposalDetail(proposal: ProposalRow): Promise<PublicProposalDetail> {
  const eligible = await eligibleMemberIds(proposal)
  const eligibleCount = eligible.length
  const [voteCountRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(governanceVotes)
    .where(and(eq(governanceVotes.proposalId, proposal.id), eq(governanceVotes.isActive, true)))
  const voteCount = voteCountRow?.n ?? 0
  const remaining = Math.max(eligibleCount - voteCount, 0)
  const turnout = eligibleCount > 0 ? (voteCount / eligibleCount) * 100 : 0

  const closed = ["closed", "results_published", "archived"].includes(proposal.status)
  const showLiveResults = Boolean(proposal.showLiveResults)
  const showResults = closed || showLiveResults

  let result: Awaited<ReturnType<typeof getProposalResult>> = null
  let optionTally: Record<string, number> = {}
  let anchorHash: string | null = null

  if (showResults) {
    result = await getProposalResult(proposal.id)
    // Live results while the vote is still open need an on-the-fly tally.
    if (!result && showLiveResults && proposal.status === "active") {
      result = await liveTally(proposal)
    }
    if (result?.optionTally) {
      try {
        optionTally = typeof result.optionTally === "string" ? JSON.parse(result.optionTally) : result.optionTally
      } catch {
        optionTally = {}
      }
    }
    if (closed) {
      const anchor = await getProposalAnchor(proposal.id)
      anchorHash = anchor?.txHash ?? null
    }
  }

  return {
    proposal,
    eligibleCount,
    voteCount,
    remaining,
    turnout,
    result,
    optionTally,
    anchorHash,
    showResults,
    showLiveResults,
  }
}

/** On-the-fly tally for live results (does not persist). */
async function liveTally(proposal: ProposalRow) {
  const votes = await db
    .select({ choice: governanceVotes.choice, optionId: governanceVotes.optionId })
    .from(governanceVotes)
    .where(and(eq(governanceVotes.proposalId, proposal.id), eq(governanceVotes.isActive, true)))
  let yesCount = 0
  let noCount = 0
  let abstainCount = 0
  const optionTally: Record<string, number> = {}
  for (const v of votes) {
    if (v.choice === "yes") yesCount++
    else if (v.choice === "no") noCount++
    else if (v.choice === "abstain") abstainCount++
    else if (v.choice === "option" && v.optionId != null) {
      optionTally[String(v.optionId)] = (optionTally[String(v.optionId)] ?? 0) + 1
    }
  }
  return {
    id: 0,
    proposalId: proposal.id,
    eligibleCount: 0,
    totalVotes: votes.length,
    yesCount,
    noCount,
    abstainCount,
    optionTally: JSON.stringify(optionTally),
    outcome: "pending",
    resultHash: "",
    computedAt: new Date(),
  } as Awaited<ReturnType<typeof getProposalResult>>
}

export type PublicParticipant = {
  identifier: string // membership number OR governance id, per visibility
  choice: string | null // null unless individual votes are public
  castAt: Date
  xrplVerified: boolean
}

/**
 * Public member-participation list for a proposal. Identity + choice are only
 * revealed when the proposal's visibility flags allow it, otherwise the
 * governance ID is used and the choice is hidden.
 */
export async function getPublicParticipation(proposal: ProposalRow): Promise<PublicParticipant[]> {
  const rows = await db
    .select({
      memberId: governanceVotes.memberId,
      choice: governanceVotes.choice,
      castAt: governanceVotes.castAt,
      xrplStatus: governanceVotes.xrplStatus,
      membershipId: members.membershipId,
      publicId: governancePublicIds.publicId,
    })
    .from(governanceVotes)
    .leftJoin(members, eq(members.id, governanceVotes.memberId))
    .leftJoin(governancePublicIds, eq(governancePublicIds.memberId, governanceVotes.memberId))
    .where(and(eq(governanceVotes.proposalId, proposal.id), eq(governanceVotes.isActive, true)))
    .orderBy(desc(governanceVotes.castAt))

  const showNumber = Boolean(proposal.showMemberNumberPublicly)
  const showChoice = Boolean(proposal.showIndividualVotesPublicly)

  return rows.map((r) => ({
    identifier: showNumber && r.membershipId ? r.membershipId : r.publicId ?? "VAAP-G-—",
    choice: showChoice ? r.choice : null,
    castAt: r.castAt,
    xrplVerified: r.xrplStatus === "verified",
  }))
}

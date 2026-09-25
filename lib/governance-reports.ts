import { db } from "@/lib/db"
import {
  governanceProposals,
  governanceResults,
  governanceVotes,
  elections as governanceElections,
  electionCandidates,
  electionResults,
  governanceAuditLogs,
  xrplTransactions,
  xrplAnchors,
} from "@/lib/db/schema"
import { and, desc, eq, gte, lte, sql } from "drizzle-orm"

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/** Escape a single CSV field per RFC 4180. */
export function csvField(value: unknown): string {
  if (value == null) return ""
  const str = typeof value === "string" ? value : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Build a CSV string from a header row and data rows. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvField).join(",")]
  for (const row of rows) {
    lines.push(row.map(csvField).join(","))
  }
  // Prepend BOM so Excel opens UTF-8 correctly.
  return "\uFEFF" + lines.join("\r\n")
}

// ---------------------------------------------------------------------------
// Dashboard summary
// ---------------------------------------------------------------------------

export type GovernanceSummary = {
  proposals: { total: number; open: number; closed: number; passed: number }
  elections: { total: number; open: number; closed: number }
  votesCast: number
  ballotsCast: number
  xrpl: { verified: number; pending: number; failed: number }
}

export async function getGovernanceSummary(): Promise<GovernanceSummary> {
  const [proposalRows, electionRows, voteCount, ballotCount, txRows] = await Promise.all([
    db.select({ status: governanceProposals.status }).from(governanceProposals),
    db.select({ status: governanceElections.status }).from(governanceElections),
    db.select({ n: sql<number>`count(*)::int` }).from(governanceVotes),
    db.select({ n: sql<number>`count(*)::int` }).from(electionResults),
    db.select({ status: xrplTransactions.status }).from(xrplTransactions),
  ])

  const proposalResults = await db
    .select({ outcome: governanceResults.outcome })
    .from(governanceResults)

  const openStatuses = new Set(["open", "voting", "active"])
  const closedStatuses = new Set(["closed", "completed", "archived"])

  return {
    proposals: {
      total: proposalRows.length,
      open: proposalRows.filter((r) => openStatuses.has(r.status)).length,
      closed: proposalRows.filter((r) => closedStatuses.has(r.status)).length,
      passed: proposalResults.filter((r) => r.outcome === "passed").length,
    },
    elections: {
      total: electionRows.length,
      open: electionRows.filter((r) => openStatuses.has(r.status)).length,
      closed: electionRows.filter((r) => closedStatuses.has(r.status)).length,
    },
    votesCast: voteCount[0]?.n ?? 0,
    ballotsCast: ballotCount[0]?.n ?? 0,
    xrpl: {
      verified: txRows.filter((r) => r.status === "verified").length,
      pending: txRows.filter((r) => r.status === "pending" || r.status === "submitted").length,
      failed: txRows.filter((r) => r.status === "failed").length,
    },
  }
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export type AuditFilter = {
  action?: string
  entityType?: string
  from?: Date
  to?: Date
  limit?: number
}

export async function listAuditLogs(filter: AuditFilter = {}) {
  const conditions = []
  if (filter.action) conditions.push(eq(governanceAuditLogs.action, filter.action))
  if (filter.entityType) conditions.push(eq(governanceAuditLogs.entityType, filter.entityType))
  if (filter.from) conditions.push(gte(governanceAuditLogs.createdAt, filter.from))
  if (filter.to) conditions.push(lte(governanceAuditLogs.createdAt, filter.to))

  return db
    .select()
    .from(governanceAuditLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(governanceAuditLogs.createdAt))
    .limit(filter.limit ?? 500)
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export async function exportProposalResultsCsv(): Promise<string> {
  const rows = await db
    .select({
      id: governanceProposals.id,
      reference: governanceProposals.reference,
      title: governanceProposals.title,
      status: governanceProposals.status,
      eligibleCount: governanceResults.eligibleCount,
      totalVotes: governanceResults.totalVotes,
      yesCount: governanceResults.yesCount,
      noCount: governanceResults.noCount,
      abstainCount: governanceResults.abstainCount,
      outcome: governanceResults.outcome,
      resultHash: governanceResults.resultHash,
      computedAt: governanceResults.computedAt,
    })
    .from(governanceProposals)
    .leftJoin(governanceResults, eq(governanceResults.proposalId, governanceProposals.id))
    .orderBy(desc(governanceProposals.id))

  const anchors = await db
    .select({ refId: xrplAnchors.refId, txHash: xrplAnchors.txHash, status: xrplAnchors.status })
    .from(xrplAnchors)
    .where(eq(xrplAnchors.anchorType, "proposal_result"))
  const anchorMap = new Map(anchors.map((a) => [a.refId, a]))

  return toCsv(
    [
      "Proposal ID",
      "Reference",
      "Title",
      "Status",
      "Eligible",
      "Total Votes",
      "Yes",
      "No",
      "Abstain",
      "Outcome",
      "Result Hash",
      "XRPL Tx Hash",
      "XRPL Status",
      "Computed At",
    ],
    rows.map((r) => {
      const anchor = anchorMap.get(r.id)
      return [
        r.id,
        r.reference,
        r.title,
        r.status,
        r.eligibleCount ?? 0,
        r.totalVotes ?? 0,
        r.yesCount ?? 0,
        r.noCount ?? 0,
        r.abstainCount ?? 0,
        r.outcome ?? "pending",
        r.resultHash ?? "",
        anchor?.txHash ?? "",
        anchor?.status ?? "",
        r.computedAt ? new Date(r.computedAt).toISOString() : "",
      ]
    }),
  )
}

export async function exportElectionResultsCsv(): Promise<string> {
  const rows = await db
    .select({
      electionId: governanceElections.id,
      electionTitle: governanceElections.title,
      electionStatus: governanceElections.status,
      candidateId: electionCandidates.id,
      candidateName: electionCandidates.name,
      votes: electionResults.votes,
      isWinner: electionResults.isWinner,
      resultHash: electionResults.resultHash,
      computedAt: electionResults.computedAt,
    })
    .from(governanceElections)
    .leftJoin(electionCandidates, eq(electionCandidates.electionId, governanceElections.id))
    .leftJoin(
      electionResults,
      and(
        eq(electionResults.electionId, governanceElections.id),
        eq(electionResults.candidateId, electionCandidates.id),
      ),
    )
    .orderBy(desc(governanceElections.id), desc(electionResults.votes))

  return toCsv(
    [
      "Election ID",
      "Election",
      "Status",
      "Candidate ID",
      "Candidate",
      "Votes",
      "Winner",
      "Result Hash",
      "Computed At",
    ],
    rows.map((r) => [
      r.electionId,
      r.electionTitle,
      r.electionStatus,
      r.candidateId ?? "",
      r.candidateName ?? "",
      r.votes ?? 0,
      r.isWinner ? "yes" : "",
      r.resultHash ?? "",
      r.computedAt ? new Date(r.computedAt).toISOString() : "",
    ]),
  )
}

export async function exportAuditLogCsv(filter: AuditFilter = {}): Promise<string> {
  const rows = await listAuditLogs({ ...filter, limit: filter.limit ?? 5000 })
  return toCsv(
    ["ID", "Time", "Actor", "Role", "Action", "Entity Type", "Entity ID", "IP", "Detail"],
    rows.map((r) => [
      r.id,
      new Date(r.createdAt).toISOString(),
      r.actorName,
      r.actorRole,
      r.action,
      r.entityType,
      r.entityId,
      r.ipAddress,
      r.detail,
    ]),
  )
}

export async function exportXrplLedgerCsv(): Promise<string> {
  const rows = await db.select().from(xrplTransactions).orderBy(desc(xrplTransactions.id))
  return toCsv(
    ["ID", "Job Type", "Ref Table", "Ref ID", "Network", "Tx Hash", "Ledger Index", "Account", "Status", "Validated At", "Created At"],
    rows.map((r) => [
      r.id,
      r.jobType,
      r.refTable,
      r.refId,
      r.network,
      r.txHash ?? "",
      r.ledgerIndex ?? "",
      r.account,
      r.status,
      r.validatedAt ? new Date(r.validatedAt).toISOString() : "",
      new Date(r.createdAt).toISOString(),
    ]),
  )
}

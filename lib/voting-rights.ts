import "server-only"
import { db } from "@/lib/db"
import { members, governanceMemberPermissions, governanceAuditLogs } from "@/lib/db/schema"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"

// ---------------------------------------------------------------------------
// Two independent voting rights per member:
//   - election   : formal VAAP elections (office bearers)
//   - governance : governance / project / DAO proposals
// Each moves through its own lifecycle, managed by super-admins.
// ---------------------------------------------------------------------------

export type VotingStatus = "pending" | "approved" | "rejected" | "suspended" | "revoked"
export type RightKind = "election" | "governance"

export const VOTING_STATUSES: VotingStatus[] = ["pending", "approved", "rejected", "suspended", "revoked"]

export function isVotingStatus(v: string): v is VotingStatus {
  return (VOTING_STATUSES as string[]).includes(v)
}

export type MemberVotingRights = {
  memberId: number
  electionStatus: VotingStatus
  governanceStatus: VotingStatus
  electionApprovedBy: string
  electionApprovedAt: Date | null
  electionReason: string
  governanceApprovedBy: string
  governanceApprovedAt: Date | null
  governanceReason: string
}

const DEFAULT_RIGHTS = (memberId: number): MemberVotingRights => ({
  memberId,
  electionStatus: "pending",
  governanceStatus: "pending",
  electionApprovedBy: "",
  electionApprovedAt: null,
  electionReason: "",
  governanceApprovedBy: "",
  governanceApprovedAt: null,
  governanceReason: "",
})

/** Full voting-rights record for a member (falls back to all-pending). */
export async function getVotingRights(memberId: number): Promise<MemberVotingRights> {
  const [row] = await db
    .select()
    .from(governanceMemberPermissions)
    .where(eq(governanceMemberPermissions.memberId, memberId))
    .limit(1)
  if (!row) return DEFAULT_RIGHTS(memberId)
  return {
    memberId,
    electionStatus: (row.electionStatus as VotingStatus) ?? "pending",
    governanceStatus: (row.governanceStatus as VotingStatus) ?? "pending",
    electionApprovedBy: row.electionApprovedBy ?? "",
    electionApprovedAt: row.electionApprovedAt ?? null,
    electionReason: row.electionReason ?? "",
    governanceApprovedBy: row.governanceApprovedBy ?? "",
    governanceApprovedAt: row.governanceApprovedAt ?? null,
    governanceReason: row.governanceReason ?? "",
  }
}

export async function hasElectionRight(memberId: number): Promise<boolean> {
  const r = await getVotingRights(memberId)
  return r.electionStatus === "approved"
}

export async function hasGovernanceRight(memberId: number): Promise<boolean> {
  const r = await getVotingRights(memberId)
  return r.governanceStatus === "approved"
}

/** Active, non-deleted member ids with an APPROVED governance voting right. */
export async function approvedGovernanceMemberIds(): Promise<number[]> {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .innerJoin(governanceMemberPermissions, eq(governanceMemberPermissions.memberId, members.id))
    .where(
      and(
        eq(members.status, "active"),
        isNull(members.deletedAt),
        eq(governanceMemberPermissions.governanceStatus, "approved"),
      ),
    )
  return rows.map((r) => r.id)
}

/** Active, non-deleted member ids with an APPROVED election voting right. */
export async function approvedElectionMemberIds(): Promise<number[]> {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .innerJoin(governanceMemberPermissions, eq(governanceMemberPermissions.memberId, members.id))
    .where(
      and(
        eq(members.status, "active"),
        isNull(members.deletedAt),
        eq(governanceMemberPermissions.electionStatus, "approved"),
      ),
    )
  return rows.map((r) => r.id)
}

export type MemberVotingRow = {
  memberId: number
  membershipId: string
  name: string
  email: string
  organization: string | null
  category: string
  membershipStatus: string
  votingEligible: boolean
  goodStanding: boolean
  joinedAt: Date
  electionStatus: VotingStatus
  governanceStatus: VotingStatus
  electionApprovedBy: string
  electionApprovedAt: Date | null
  electionReason: string
  governanceApprovedBy: string
  governanceApprovedAt: Date | null
  governanceReason: string
}

/** Every active member joined with their voting-rights record for the admin table. */
export async function listMemberVotingRights(): Promise<MemberVotingRow[]> {
  const rows = await db
    .select({
      memberId: members.id,
      membershipId: members.membershipId,
      name: members.name,
      email: members.email,
      organization: members.organization,
      category: members.category,
      membershipStatus: members.status,
      votingEligible: members.votingEligible,
      goodStanding: members.goodStanding,
      joinedAt: members.joinedAt,
      electionStatus: governanceMemberPermissions.electionStatus,
      governanceStatus: governanceMemberPermissions.governanceStatus,
      electionApprovedBy: governanceMemberPermissions.electionApprovedBy,
      electionApprovedAt: governanceMemberPermissions.electionApprovedAt,
      electionReason: governanceMemberPermissions.electionReason,
      governanceApprovedBy: governanceMemberPermissions.governanceApprovedBy,
      governanceApprovedAt: governanceMemberPermissions.governanceApprovedAt,
      governanceReason: governanceMemberPermissions.governanceReason,
    })
    .from(members)
    .leftJoin(governanceMemberPermissions, eq(governanceMemberPermissions.memberId, members.id))
    .where(isNull(members.deletedAt))
    .orderBy(desc(members.joinedAt))

  return rows.map((r) => ({
    memberId: r.memberId,
    membershipId: r.membershipId ?? "",
    name: r.name ?? "",
    email: r.email ?? "",
    organization: r.organization ?? null,
    category: r.category ?? "",
    membershipStatus: r.membershipStatus ?? "",
    votingEligible: Boolean(r.votingEligible),
    goodStanding: Boolean(r.goodStanding),
    joinedAt: r.joinedAt,
    electionStatus: (r.electionStatus as VotingStatus) ?? "pending",
    governanceStatus: (r.governanceStatus as VotingStatus) ?? "pending",
    electionApprovedBy: r.electionApprovedBy ?? "",
    electionApprovedAt: r.electionApprovedAt ?? null,
    electionReason: r.electionReason ?? "",
    governanceApprovedBy: r.governanceApprovedBy ?? "",
    governanceApprovedAt: r.governanceApprovedAt ?? null,
    governanceReason: r.governanceReason ?? "",
  }))
}

async function ensurePermissionRow(memberId: number) {
  const [row] = await db
    .select({ id: governanceMemberPermissions.id })
    .from(governanceMemberPermissions)
    .where(eq(governanceMemberPermissions.memberId, memberId))
    .limit(1)
  if (row) return row.id
  const [created] = await db
    .insert(governanceMemberPermissions)
    .values({ memberId })
    .returning({ id: governanceMemberPermissions.id })
  return created.id
}

// Keep the legacy members.votingEligible flag in sync so any surface still
// reading it stays consistent: a member is "voting eligible" if they hold
// either approved right.
async function syncLegacyVotingEligible(memberId: number) {
  const r = await getVotingRights(memberId)
  const eligible = r.electionStatus === "approved" || r.governanceStatus === "approved"
  await db.update(members).set({ votingEligible: eligible }).where(eq(members.id, memberId))
}

async function writeAudit(entry: {
  actor: { id: string; name?: string | null; role?: string | null }
  action: string
  memberId: number
  detail?: unknown
}) {
  try {
    await db.insert(governanceAuditLogs).values({
      actorId: entry.actor.id,
      actorName: entry.actor.name ?? "",
      actorRole: entry.actor.role ?? "",
      action: entry.action,
      entityType: "member_voting_rights",
      entityId: String(entry.memberId),
      detail: entry.detail ? JSON.stringify(entry.detail).slice(0, 4000) : "",
    })
  } catch {
    // audit failures must never block the primary write
  }
}

/** Set one voting right for one member, with audit + legacy sync. */
export async function setVotingRight(params: {
  memberId: number
  kind: RightKind
  status: VotingStatus
  actor: { id: string; name?: string | null; role?: string | null }
  reason?: string
}): Promise<{ ok: true; previous: VotingStatus } | { ok: false; error: string }> {
  const { memberId, kind, status, actor, reason } = params
  if (!isVotingStatus(status)) return { ok: false, error: "Invalid status." }

  const before = await getVotingRights(memberId)
  const previous = kind === "election" ? before.electionStatus : before.governanceStatus

  await ensurePermissionRow(memberId)
  const now = new Date()
  const actorLabel = actor.name?.trim() || actor.id

  const patch =
    kind === "election"
      ? {
          electionStatus: status,
          electionApprovedBy: actorLabel,
          electionApprovedAt: now,
          electionReason: reason?.trim() ?? "",
          updatedAt: now,
        }
      : {
          governanceStatus: status,
          governanceApprovedBy: actorLabel,
          governanceApprovedAt: now,
          governanceReason: reason?.trim() ?? "",
          updatedAt: now,
        }

  await db.update(governanceMemberPermissions).set(patch).where(eq(governanceMemberPermissions.memberId, memberId))
  await syncLegacyVotingEligible(memberId)
  await writeAudit({
    actor,
    action: `voting_right.${kind}.${status}`,
    memberId,
    detail: { kind, from: previous, to: status, reason: reason?.trim() || undefined },
  })
  return { ok: true, previous }
}

/** Apply the same right change to many members at once. */
export async function bulkSetVotingRight(params: {
  memberIds: number[]
  kind: RightKind
  status: VotingStatus
  actor: { id: string; name?: string | null; role?: string | null }
  reason?: string
}): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const { memberIds, kind, status, actor, reason } = params
  if (!isVotingStatus(status)) return { ok: false, error: "Invalid status." }
  if (memberIds.length === 0) return { ok: true, count: 0 }

  // Insert missing permission rows first so the bulk UPDATE covers everyone.
  const existing = await db
    .select({ memberId: governanceMemberPermissions.memberId })
    .from(governanceMemberPermissions)
    .where(inArray(governanceMemberPermissions.memberId, memberIds))
  const existingIds = new Set(existing.map((r) => r.memberId))
  const missing = memberIds.filter((id) => !existingIds.has(id))
  if (missing.length > 0) {
    await db.insert(governanceMemberPermissions).values(missing.map((memberId) => ({ memberId })))
  }

  const now = new Date()
  const actorLabel = actor.name?.trim() || actor.id
  const patch =
    kind === "election"
      ? {
          electionStatus: status,
          electionApprovedBy: actorLabel,
          electionApprovedAt: now,
          electionReason: reason?.trim() ?? "",
          updatedAt: now,
        }
      : {
          governanceStatus: status,
          governanceApprovedBy: actorLabel,
          governanceApprovedAt: now,
          governanceReason: reason?.trim() ?? "",
          updatedAt: now,
        }

  await db
    .update(governanceMemberPermissions)
    .set(patch)
    .where(inArray(governanceMemberPermissions.memberId, memberIds))

  for (const memberId of memberIds) {
    await syncLegacyVotingEligible(memberId)
  }
  await writeAudit({
    actor,
    action: `voting_right.${kind}.bulk.${status}`,
    memberId: 0,
    detail: { kind, to: status, memberIds, reason: reason?.trim() || undefined },
  })
  return { ok: true, count: memberIds.length }
}

"use server"

import { db } from "@/lib/db"
import { members, auditLogs } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { computeExpiry } from "@/lib/membership"
import { notify } from "@/lib/notifications"
import { eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// Human-readable copy for each member status transition, reused by the single
// and bulk status actions.
const MEMBER_STATUS_COPY: Record<
  "active" | "suspended" | "expired",
  { title: string; body: string; subject: string; intro: string[] }
> = {
  active: {
    title: "Your membership is active",
    body: "Your VAAP membership is now active and in good standing.",
    subject: "Your VAAP membership is now active",
    intro: [
      "Good news — your membership with the Virtual Assets Association of Pakistan is now active and in good standing.",
      "You have full access to member resources, events, and voting eligibility where applicable.",
    ],
  },
  suspended: {
    title: "Your membership has been suspended",
    body: "Your VAAP membership has been suspended. Please contact us for details.",
    subject: "Your VAAP membership has been suspended",
    intro: [
      "Your membership with the Virtual Assets Association of Pakistan has been suspended.",
      "If you have questions or believe this was in error, please reply to this email and our team will assist you.",
    ],
  },
  expired: {
    title: "Your membership has expired",
    body: "Your VAAP membership has expired. Renew from your dashboard to restore access.",
    subject: "Your VAAP membership has expired",
    intro: [
      "Your membership with the Virtual Assets Association of Pakistan has expired.",
      "You can renew from your dashboard to restore full member access and benefits.",
    ],
  },
}

async function notifyMemberStatus(id: number, status: "active" | "suspended" | "expired") {
  try {
    const [m] = await db
      .select({ userId: members.userId, email: members.email, name: members.name })
      .from(members)
      .where(eq(members.id, id))
      .limit(1)
    if (!m) return
    const copy = MEMBER_STATUS_COPY[status]
    await notify({
      userId: m.userId ?? undefined,
      email: m.email,
      type: "membership",
      title: copy.title,
      body: copy.body,
      link: "/dashboard/membership",
      emailTemplate: {
        subject: copy.subject,
        heading: copy.title,
        intro: [`Dear ${m.name},`, ...copy.intro],
        ctaLabel: status === "expired" ? "Renew my membership" : "View my membership",
        ctaPath: "/dashboard/membership",
      },
    })
  } catch (err) {
    console.log("[v0] notifyMemberStatus failed:", err instanceof Error ? err.message : err)
  }
}

async function requireStaff() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  const role = session.user.role
  if (role !== "staff" && role !== "admin") throw new Error("Forbidden")
  return session.user
}

async function log(actor: { id: string; name?: string | null }, action: string, target: string) {
  try {
    await db.insert(auditLogs).values({ actorId: actor.id, actorName: actor.name ?? "", action, target })
  } catch {
    // audit failures must never block the primary write
  }
}

function revalidate() {
  revalidatePath("/admin/members")
  revalidatePath("/community")
}

export type MemberInput = {
  name: string
  email: string
  membershipId?: string
  organization?: string | null
  category: string
  status: string
  votingEligible: boolean
  goodStanding: boolean
  joinedAt?: string | null
  expiresAt?: string | null
}

function genMembershipId() {
  return `VAAP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
}

export async function saveMember(id: number | null, input: MemberInput) {
  const actor = await requireStaff()

  const name = input.name?.trim()
  const email = input.email?.trim()
  if (!name) return { ok: false, error: "Full name is required." }
  if (!email) return { ok: false, error: "Email is required." }

  const values: Record<string, unknown> = {
    name,
    email,
    organization: input.organization?.trim() || null,
    category: input.category || "Verified Community",
    status: input.status || "active",
    votingEligible: Boolean(input.votingEligible),
    goodStanding: Boolean(input.goodStanding),
  }

  if (input.joinedAt) values.joinedAt = new Date(input.joinedAt)
  if (input.expiresAt) {
    values.expiresAt = new Date(input.expiresAt)
  } else if (!id) {
    // New member with no explicit expiry: default to a one-year (365 day) term
    // from the join date. Edits without an expiry leave the stored value alone.
    values.expiresAt = computeExpiry((values.joinedAt as Date | undefined) ?? new Date())
  }

  try {
    if (id) {
      if (input.membershipId?.trim()) values.membershipId = input.membershipId.trim()
      await db.update(members).set(values).where(eq(members.id, id))
      await log(actor, "updated member", name)
    } else {
      values.membershipId = input.membershipId?.trim() || genMembershipId()
      await db.insert(members).values(values as typeof members.$inferInsert)
      await log(actor, "created member", name)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed."
    // Most likely a duplicate membership ID.
    if (message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: "That membership ID is already in use." }
    }
    return { ok: false, error: message }
  }

  revalidate()
  return { ok: true }
}

export async function setMemberStatus(id: number, status: "active" | "suspended" | "expired") {
  const actor = await requireStaff()
  await db.update(members).set({ status }).where(eq(members.id, id))
  await log(actor, `set member ${status}`, String(id))
  await notifyMemberStatus(id, status)
  revalidate()
  return { ok: true }
  }

export async function setMemberVoting(id: number, votingEligible: boolean) {
  const actor = await requireStaff()
  // Approving voting also clears any pending request the member submitted;
  // revoking leaves the request flag untouched.
  await db
    .update(members)
    .set(votingEligible ? { votingEligible: true, voteRequested: false } : { votingEligible: false })
    .where(eq(members.id, id))
  await log(actor, votingEligible ? "approved voting" : "revoked voting", String(id))
  revalidatePath("/admin/members")
  revalidatePath("/community")
  revalidatePath("/dashboard/voting")
  return { ok: true }
}

// Soft delete: move members into the recoverable trash folder.
export async function deleteMembers(ids: number[]) {
  const actor = await requireStaff()
  if (ids.length === 0) return { ok: true }
  await db.update(members).set({ deletedAt: new Date() }).where(inArray(members.id, ids))
  await log(actor, "moved members to trash", ids.join(", "))
  revalidate()
  return { ok: true }
}

// Restore members from the trash folder back into the active list.
export async function restoreMembers(ids: number[]) {
  const actor = await requireStaff()
  if (ids.length === 0) return { ok: true }
  await db.update(members).set({ deletedAt: null }).where(inArray(members.id, ids))
  await log(actor, "restored members", ids.join(", "))
  revalidate()
  return { ok: true }
}

// Permanently remove members from the trash folder. Cannot be undone.
export async function purgeMembers(ids: number[]) {
  const actor = await requireStaff()
  if (ids.length === 0) return { ok: true }
  await db.delete(members).where(inArray(members.id, ids))
  await log(actor, "permanently deleted members", ids.join(", "))
  revalidate()
  return { ok: true }
}

export async function bulkSetStatus(ids: number[], status: "active" | "suspended" | "expired") {
  const actor = await requireStaff()
  if (ids.length === 0) return { ok: true }
  await db.update(members).set({ status }).where(inArray(members.id, ids))
  await log(actor, `bulk set ${status}`, ids.join(", "))
  await Promise.all(ids.map((memberId) => notifyMemberStatus(memberId, status)))
  revalidate()
  return { ok: true }
  }

export async function importMembers(rows: MemberInput[]) {
  const actor = await requireStaff()
  let created = 0
  for (const row of rows) {
    const name = row.name?.trim()
    const email = row.email?.trim()
    if (!name || !email) continue
    try {
      const joined = row.joinedAt ? new Date(row.joinedAt) : new Date()
      await db.insert(members).values({
        name,
        email,
        membershipId: row.membershipId?.trim() || genMembershipId(),
        organization: row.organization?.trim() || null,
        category: row.category?.trim() || "Verified Community",
        status: row.status?.trim() || "active",
        votingEligible: Boolean(row.votingEligible),
        goodStanding: row.goodStanding === undefined ? true : Boolean(row.goodStanding),
        joinedAt: joined,
        // One-year (365 day) term from the join date unless a date is supplied.
        expiresAt: row.expiresAt ? new Date(row.expiresAt) : computeExpiry(joined),
      })
      created++
    } catch {
      // skip duplicates / bad rows, keep importing the rest
    }
  }
  await log(actor, "imported members", String(created))
  revalidate()
  return { ok: true, created }
}

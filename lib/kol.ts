import "server-only"
import { createHmac } from "node:crypto"
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { kolAuditLog, kolProfiles, members, referralCodes } from "@/lib/db/schema"
import { appBaseUrl, sendTemplateEmail } from "@/lib/email-templates/service"
import type { EmailTemplateKey } from "@/lib/email-templates/registry"
import { formatDate, KOL_VALIDITY_DAYS, type KolStatus } from "@/lib/kol-shared"
import { buildReferralCode } from "@/lib/referral"

export type KolProfile = typeof kolProfiles.$inferSelect

export const KOL_CODE_LABEL = "Verified KOL referral code"

/**
 * Gives a verified KOL a referral code owned by their login, reusing (and
 * re-activating) any code they already own. Members without a linked login
 * cannot be credited, so they are skipped.
 */
export async function ensureKolReferralCode(memberId: number) {
  const [member] = await db
    .select({ userId: members.userId, name: members.name })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1)
  if (!member?.userId) return null

  const [existing] = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.ownerUserId, member.userId))
    .limit(1)
  if (existing) {
    if (!existing.active) {
      await db.update(referralCodes).set({ active: true }).where(eq(referralCodes.id, existing.id))
    }
    return existing.code
  }

  const [profile] = await db
    .select({ professionalName: kolProfiles.professionalName, fullName: kolProfiles.fullName })
    .from(kolProfiles)
    .where(eq(kolProfiles.memberId, memberId))
    .limit(1)
  const name = profile?.professionalName || profile?.fullName || member.name || "KOL"
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(referralCodes)

  for (let i = 0; i < 10; i++) {
    const code = buildReferralCode(name, (count ?? 0) + 1 + i, "KOL")
    // The live table has no unique constraint on `code`, so ON CONFLICT can't be used; check first instead.
    const [taken] = await db
      .select({ id: referralCodes.id })
      .from(referralCodes)
      .where(eq(referralCodes.code, code))
      .limit(1)
    if (taken) continue
    try {
      const [row] = await db
        .insert(referralCodes)
        .values({ code, ownerUserId: member.userId, label: KOL_CODE_LABEL })
        .returning({ code: referralCodes.code })
      if (row) return row.code
    } catch (error) {
      if ((error as { cause?: { code?: string } }).cause?.code !== "23505") throw error
    }
  }
  return null
}

/** Pauses a KOL-issued code when verification ends; staff-owned codes are left alone. */
async function deactivateKolReferralCode(memberId: number) {
  const [member] = await db.select({ userId: members.userId }).from(members).where(eq(members.id, memberId)).limit(1)
  if (!member?.userId) return
  await db
    .update(referralCodes)
    .set({ active: false })
    .where(and(eq(referralCodes.ownerUserId, member.userId), eq(referralCodes.label, KOL_CODE_LABEL)))
}

/** True when this login belongs to an active member with an unexpired KOL verification. */
export async function isVerifiedKolUser(userId: string) {
  const [row] = await db
    .select({ expiresAt: kolProfiles.expiresAt })
    .from(kolProfiles)
    .innerJoin(members, eq(members.id, kolProfiles.memberId))
    .where(
      and(
        eq(members.userId, userId),
        eq(kolProfiles.status, "verified"),
        eq(members.status, "active"),
        isNull(members.deletedAt),
      ),
    )
    .limit(1)
  return !!row && (!row.expiresAt || row.expiresAt.getTime() > Date.now())
}

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "kol"
  )
}

async function uniqueSlug(base: string, memberId: number) {
  const root = slugify(base)
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`
    const [hit] = await db.select({ memberId: kolProfiles.memberId }).from(kolProfiles).where(eq(kolProfiles.slug, candidate)).limit(1)
    if (!hit || hit.memberId === memberId) return candidate
  }
  return `${root}-${memberId}`
}

/** Short code the KOL adds to a social bio so reviewers can confirm account ownership. */
export function ownershipCode(memberId: number) {
  const secret = process.env.BETTER_AUTH_SECRET ?? "vaap"
  return `VAAP-${createHmac("sha256", secret).update(`kol:${memberId}`).digest("hex").slice(0, 6).toUpperCase()}`
}

export async function getMemberById(memberId: number) {
  const [m] = await db.select().from(members).where(and(eq(members.id, memberId), isNull(members.deletedAt))).limit(1)
  return m ?? null
}

export async function getKolByMemberId(memberId: number) {
  const [row] = await db.select().from(kolProfiles).where(eq(kolProfiles.memberId, memberId)).limit(1)
  return row ?? null
}

/** Returns the member's KOL profile, creating an empty draft seeded from the member record if needed. */
export async function ensureKolProfile(memberId: number) {
  const existing = await getKolByMemberId(memberId)
  if (existing) return existing
  const member = await getMemberById(memberId)
  if (!member) throw new Error("Member not found")
  const slug = await uniqueSlug(member.name, memberId)
  const [row] = await db
    .insert(kolProfiles)
    .values({
      memberId,
      slug,
      fullName: member.name,
      organization: member.organization ?? "",
      title: member.designation ?? "",
      city: member.city ?? "",
      bio: member.bio ?? "",
      platforms: member.linkedin
        ? [{ platform: "linkedin", url: member.linkedin, followers: 0, avgViews: 0, engagement: 0, ownershipVerified: false }]
        : [],
    })
    .onConflictDoNothing()
    .returning()
  return row ?? (await getKolByMemberId(memberId))!
}

export async function refreshSlug(memberId: number, name: string) {
  const slug = await uniqueSlug(name, memberId)
  await db.update(kolProfiles).set({ slug }).where(eq(kolProfiles.memberId, memberId))
}

export async function logKol(memberId: number, action: string, opts: { from?: string | null; to?: string | null; note?: string; actor?: string }) {
  await db.insert(kolAuditLog).values({
    memberId,
    action,
    fromStatus: opts.from ?? null,
    toStatus: opts.to ?? null,
    note: opts.note ?? "",
    actor: opts.actor ?? "",
  })
}

export async function getKolAudit(memberId: number) {
  return db.select().from(kolAuditLog).where(eq(kolAuditLog.memberId, memberId)).orderBy(desc(kolAuditLog.createdAt)).limit(100)
}

export function totalFollowers(p: Pick<KolProfile, "platforms">) {
  return (p.platforms ?? []).reduce((sum, x) => sum + (Number(x.followers) || 0), 0)
}

export function profileUrl(slug: string) {
  return `${appBaseUrl()}/membership/verified-opinion-leaders/${slug}`
}

export async function emailKol(memberId: number, key: EmailTemplateKey, vars: Record<string, string> = {}) {
  const member = await getMemberById(memberId)
  if (!member?.email) return false
  try {
    return await sendTemplateEmail({ to: member.email, key, vars: { name: member.name, ...vars } })
  } catch (error) {
    console.error("[v0] KOL email failed", key, error)
    return false
  }
}

/** Applies an admin decision, keeps timestamps consistent, writes the audit log and notifies the member. */
export async function transitionKol(
  memberId: number,
  to: KolStatus,
  opts: { actor: string; note?: string; notify?: boolean },
) {
  const profile = await ensureKolProfile(memberId)
  const now = new Date()
  const patch: Partial<KolProfile> = { status: to, updatedAt: now, reviewedBy: opts.actor }
  if (opts.note !== undefined) patch.adminNote = opts.note
  if (to === "verified") {
    patch.verifiedAt = now
    patch.expiresAt = new Date(now.getTime() + KOL_VALIDITY_DAYS * 86_400_000)
    patch.reminderSentAt = null
  }
  if (to === "revoked" || to === "rejected") patch.expiresAt = null
  await db.update(kolProfiles).set(patch).where(eq(kolProfiles.memberId, memberId))
  await logKol(memberId, "status", { from: profile.status, to, note: opts.note, actor: opts.actor })

  if (to === "verified") {
    const code = await ensureKolReferralCode(memberId)
    if (code) await logKol(memberId, "referral_code", { note: `Referral code ${code} issued`, actor: opts.actor })
  } else if (to === "revoked" || to === "rejected") {
    await deactivateKolReferralCode(memberId)
  }

  if (opts.notify === false) return
  const note = opts.note?.trim() || "No additional details were provided."
  if (to === "verified") {
    await emailKol(memberId, "kol.approved", { url: profileUrl(profile.slug), expires: formatDate(patch.expiresAt) })
  } else if (to === "rejected") {
    await emailKol(memberId, "kol.rejected", { note })
  } else if (to === "info_required") {
    await emailKol(memberId, "kol.info-requested", { note })
  } else if (to === "revoked") {
    await emailKol(memberId, "kol.revoked", { note })
  }
}

/** Public directory: verified, unexpired profiles of active members only. */
export async function getPublicKols() {
  const rows = await db
    .select({ kol: kolProfiles })
    .from(kolProfiles)
    .innerJoin(members, eq(members.id, kolProfiles.memberId))
    .where(and(eq(kolProfiles.status, "verified"), eq(members.status, "active"), isNull(members.deletedAt)))
    .orderBy(desc(kolProfiles.monthlyReach), desc(kolProfiles.verifiedAt), desc(kolProfiles.createdAt))
  const now = Date.now()
  return rows.map((r) => r.kol).filter((k) => !k.expiresAt || k.expiresAt.getTime() > now)
}

export async function getPublicKolBySlug(slug: string) {
  const list = await getPublicKols()
  return list.find((k) => k.slug === slug) ?? null
}

/** Daily maintenance: send 30-day expiry reminders and expire lapsed verifications. */
export async function runKolMaintenance() {
  const now = new Date()
  const soon = new Date(now.getTime() + 30 * 86_400_000)

  const expired = await db
    .select({ memberId: kolProfiles.memberId })
    .from(kolProfiles)
    .where(and(eq(kolProfiles.status, "verified"), lt(kolProfiles.expiresAt, now)))
  for (const row of expired) {
    await db.update(kolProfiles).set({ status: "expired", updatedAt: now }).where(eq(kolProfiles.memberId, row.memberId))
    await logKol(row.memberId, "status", { from: "verified", to: "expired", actor: "system", note: "Verification period ended" })
  }

  const dueReminders = await db
    .select()
    .from(kolProfiles)
    .where(
      and(
        eq(kolProfiles.status, "verified"),
        lt(kolProfiles.expiresAt, soon),
        isNull(kolProfiles.reminderSentAt),
      ),
    )
  let reminders = 0
  for (const k of dueReminders) {
    const sent = await emailKol(k.memberId, "kol.expiry-reminder", { expires: formatDate(k.expiresAt) })
    await db.update(kolProfiles).set({ reminderSentAt: now }).where(eq(kolProfiles.memberId, k.memberId))
    await logKol(k.memberId, "expiry_reminder", { actor: "system", note: sent ? "Reminder emailed" : "Reminder email failed" })
    if (sent) reminders++
  }
  return { expired: expired.length, reminders }
}

export async function kolStatusCounts() {
  const rows = await db
    .select({ status: kolProfiles.status, count: sql<number>`count(*)::int` })
    .from(kolProfiles)
    .groupBy(kolProfiles.status)
  return Object.fromEntries(rows.map((r) => [r.status, r.count])) as Record<string, number>
}

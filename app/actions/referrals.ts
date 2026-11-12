"use server"

import { db } from "@/lib/db"
import {
  referralCodes,
  referralAttributions,
  rewardTransactions,
  rewardPayments,
  referralClicks,
  notifications,
  notificationReads,
  members,
} from "@/lib/db/schema"
import { COMMUNITY_AUDIENCE, adminAudiencesFor, type NotificationScope } from "@/lib/notification-audience"
import { getSession } from "@/lib/session"
import { ensureKolReferralCode, isVerifiedKolUser } from "@/lib/kol"
import { canOwnReferralCode, isAdminAreaRole } from "@/lib/permissions"
import { buildReferralCode } from "@/lib/referral"
import { and, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm"
import { revalidatePath } from "next/cache"

async function requireUser() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  return session.user
}

// Returns the caller's referral code, creating one on first request. Only
// internal roles (staff / committee / admin) may own a code.
export async function getOrCreateMyReferralCode() {
  const current = await requireUser()
  if (!canOwnReferralCode(current.role)) {
    if (await isVerifiedKolUser(current.id)) {
      const [member] = await db.select({ id: members.id }).from(members).where(eq(members.userId, current.id)).limit(1)
      const code = member ? await ensureKolReferralCode(member.id) : null
      if (code) return { ok: true as const, code }
    }
    return { ok: false as const, error: "Your role does not include a referral code." }
  }

  const [existing] = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.ownerUserId, current.id))
    .limit(1)
  if (existing) return { ok: true as const, code: existing.code, id: existing.id }

  // Sequence = count of existing owned codes + 1, for a stable readable suffix.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(referralCodes)
  let code = buildReferralCode(current.name || current.email, (count ?? 0) + 1)

  // Guard against a rare collision on the readable code.
  for (let i = 0; i < 5; i++) {
    const [clash] = await db.select({ id: referralCodes.id }).from(referralCodes).where(eq(referralCodes.code, code)).limit(1)
    if (!clash) break
    code = buildReferralCode(current.name || current.email, (count ?? 0) + 1 + i + 1)
  }

  const [row] = await db
    .insert(referralCodes)
    .values({ code, ownerUserId: current.id, label: `${current.name}'s code` })
    .returning({ id: referralCodes.id, code: referralCodes.code })

  revalidatePath("/dashboard/referrals")
  return { ok: true as const, code: row.code, id: row.id }
}

// Everything the staff/committee referral dashboard needs, scoped to the caller.
export async function getMyReferralDashboard() {
  const current = await requireUser()

  const [codeRow] = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.ownerUserId, current.id))
    .limit(1)

  const attributions = await db
    .select()
    .from(referralAttributions)
    .where(eq(referralAttributions.referrerUserId, current.id))
    .orderBy(desc(referralAttributions.createdAt))

  const rewards = await db
    .select()
    .from(rewardTransactions)
    .where(eq(rewardTransactions.referrerUserId, current.id))
    .orderBy(desc(rewardTransactions.createdAt))

  const payments = await db
    .select()
    .from(rewardPayments)
    .where(eq(rewardPayments.recipientUserId, current.id))
    .orderBy(desc(rewardPayments.createdAt))

  const clicks = codeRow
    ? (await db.select({ c: sql<number>`count(*)::int` }).from(referralClicks).where(eq(referralClicks.codeId, codeRow.id)))[0]?.c ?? 0
    : 0

  // Aggregate reward totals by lifecycle stage.
  const paidStatuses = ["paid"]
  const approvedStatuses = ["approved", "payment_processing"]
  const pendingStatuses = ["eligible", "under_review", "pending_eligibility"]

  const sumBy = (statuses: string[]) =>
    rewards.filter((r) => statuses.includes(r.status)).reduce((a, r) => a + (r.rewardAmount || 0), 0)

  return {
    code: codeRow?.code ?? null,
    active: codeRow?.active ?? false,
    stats: {
      clicks,
      referrals: attributions.length,
      approved: attributions.filter((a) => ["reward_eligible", "approved", "reward_approved", "paid"].includes(a.status)).length,
      totalEarned: rewards.reduce((a, r) => a + (r.rewardAmount || 0), 0),
      pending: sumBy(pendingStatuses),
      approvedAmount: sumBy(approvedStatuses),
      paid: sumBy(paidStatuses),
    },
    attributions,
    rewards,
    payments,
  }
}

const PENDING_REFERRAL = ["invited", "application_started", "application_submitted", "payment_pending", "under_review"]
const APPROVED_REFERRAL = ["approved", "reward_eligible", "reward_approved"]
const COMPLETED_REFERRAL = ["paid"]
const CLOSED_REFERRAL = ["rejected", "cancelled"]
const REFERRAL_TARGETS = [1, 5, 10, 25, 50, 100]

// Read-only performance view for the admin area. Every query is pinned to the
// signed-in user's id, so a Staff Admin can never read another referrer's data.
export async function getMyReferralPerformance() {
  const current = await requireUser()
  if (!isAdminAreaRole(current.role) || !canOwnReferralCode(current.role)) throw new Error("Forbidden")

  const ensured = await getOrCreateMyReferralCode()
  const dashboard = await getMyReferralDashboard()
  const attributions = dashboard.attributions

  const countIn = (statuses: string[]) => attributions.filter((a) => statuses.includes(a.status)).length
  const approved = countIn(APPROVED_REFERRAL)
  const completed = countIn(COMPLETED_REFERRAL)
  const conversions = approved + completed
  const total = attributions.length

  return {
    code: dashboard.code ?? (ensured.ok ? ensured.code : null),
    active: dashboard.active,
    stats: {
      clicks: dashboard.stats.clicks,
      totalReferrals: total,
      registeredMembers: attributions.filter((a) => !!a.membershipId).length,
      pending: countIn(PENDING_REFERRAL),
      approved,
      completed,
      closed: countIn(CLOSED_REFERRAL),
      conversions,
      conversionRate: total ? Math.round((conversions / total) * 100) : 0,
      clickConversionRate: dashboard.stats.clicks ? Math.round((total / dashboard.stats.clicks) * 100) : 0,
      totalEarned: dashboard.stats.totalEarned,
      pendingRewards: dashboard.stats.pending,
      approvedRewards: dashboard.stats.approvedAmount,
      paidRewards: dashboard.stats.paid,
    },
    targets: REFERRAL_TARGETS.map((goal) => ({ goal, achieved: conversions >= goal })),
    recent: attributions.slice(0, 15).map((a) => ({
      id: a.id,
      memberEmail: a.memberEmail,
      status: a.status,
      membershipId: a.membershipId,
      createdAt: a.createdAt,
    })),
  }
}

export type MyReferralPerformance = Awaited<ReturnType<typeof getMyReferralPerformance>>

// Role-based notification feeds.
//   member scope: the caller's own private notifications + community updates.
//   admin scope:  admin/staff broadcasts (registrations, payments, settings),
//                 only for internal roles.
// Members can never read admin broadcasts or another user's personal rows.
function feedFilter(current: { id: string; role?: string | null }, scope: NotificationScope): SQL {
  if (scope === "admin") {
    const audiences = adminAudiencesFor(current.role)
    if (!audiences.length) throw new Error("Unauthorized")
    return and(isNull(notifications.userId), inArray(notifications.role, audiences)) as SQL
  }
  return or(
    eq(notifications.userId, current.id),
    and(isNull(notifications.userId), eq(notifications.role, COMMUNITY_AUDIENCE)),
  ) as SQL
}

function parseScope(scope: unknown): NotificationScope {
  return scope === "admin" ? "admin" : "member"
}

export async function getMyNotifications(scopeInput: NotificationScope = "member") {
  const current = await requireUser()
  const scope = parseScope(scopeInput)
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      createdAt: notifications.createdAt,
      // Personal rows carry their own flag; broadcasts use per-user receipts.
      read: sql<boolean>`CASE WHEN ${notifications.userId} IS NOT NULL THEN ${notifications.read}
        ELSE EXISTS (SELECT 1 FROM ${notificationReads}
          WHERE ${notificationReads.notificationId} = ${notifications.id}
          AND ${notificationReads.userId} = ${current.id}) END`,
    })
    .from(notifications)
    .where(feedFilter(current, scope))
    .orderBy(desc(notifications.createdAt))
    .limit(50)
}

async function markRead(current: { id: string; role?: string | null }, scope: NotificationScope, ids?: number[]) {
  const visible = feedFilter(current, scope)
  const idFilter = ids ? inArray(notifications.id, ids) : undefined

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(visible, idFilter, eq(notifications.userId, current.id), eq(notifications.read, false)))

  const broadcasts = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(visible, idFilter, isNull(notifications.userId)))
    .orderBy(desc(notifications.createdAt))
    .limit(200)
  if (broadcasts.length) {
    await db
      .insert(notificationReads)
      .values(broadcasts.map((b) => ({ notificationId: b.id, userId: current.id })))
      .onConflictDoNothing()
  }
}

export async function markNotificationsRead(ids: number[], scopeInput: NotificationScope = "member") {
  const current = await requireUser()
  const clean = ids.filter((id) => Number.isInteger(id)).slice(0, 200)
  if (!clean.length) return { ok: true as const }
  await markRead(current, parseScope(scopeInput), clean)
  revalidatePath(scopeInput === "admin" ? "/admin" : "/dashboard", "layout")
  return { ok: true as const }
}

export async function markAllNotificationsRead(scopeInput: NotificationScope = "member") {
  const current = await requireUser()
  await markRead(current, parseScope(scopeInput))
  revalidatePath(scopeInput === "admin" ? "/admin" : "/dashboard", "layout")
  return { ok: true as const }
}

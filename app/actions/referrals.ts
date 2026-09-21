"use server"

import { db } from "@/lib/db"
import {
  referralCodes,
  referralAttributions,
  rewardTransactions,
  rewardPayments,
  referralClicks,
  notifications,
} from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { canOwnReferralCode } from "@/lib/permissions"
import { buildReferralCode } from "@/lib/referral"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
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

export async function getMyNotifications() {
  const current = await requireUser()
  const rows = await db
    .select()
    .from(notifications)
    .where(
      current.role
        ? sql`(${notifications.userId} = ${current.id} OR ${notifications.role} = ${current.role})`
        : eq(notifications.userId, current.id),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50)
  return rows
}

export async function markNotificationsRead(ids: number[]) {
  const current = await requireUser()
  if (!ids.length) return { ok: true as const }
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, current.id), inArray(notifications.id, ids)))
  revalidatePath("/dashboard")
  return { ok: true as const }
}

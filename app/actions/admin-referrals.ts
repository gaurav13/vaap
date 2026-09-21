"use server"

import { db } from "@/lib/db"
import {
  referralCodes,
  referralAttributions,
  rewardTransactions,
  rewardPayments,
  referralClicks,
  commissionRules,
  notifications,
  user,
} from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { canManageRewards } from "@/lib/permissions"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

async function requireRewardManager() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (!canManageRewards(session.user.role)) throw new Error("Forbidden")
  return session.user
}

// ---- Referral console overview -------------------------------------------

export async function getReferralConsole() {
  await requireRewardManager()

  const [codeCount] = await db.select({ c: sql<number>`count(*)::int` }).from(referralCodes)
  const [clickCount] = await db.select({ c: sql<number>`count(*)::int` }).from(referralClicks)
  const [attrCount] = await db.select({ c: sql<number>`count(*)::int` }).from(referralAttributions)

  const rewardAgg = await db
    .select({
      status: rewardTransactions.status,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${rewardTransactions.rewardAmount}),0)::int`,
    })
    .from(rewardTransactions)
    .groupBy(rewardTransactions.status)

  // Leaderboard: top referrers by approved+paid reward value.
  const leaderboard = await db
    .select({
      referrerUserId: rewardTransactions.referrerUserId,
      referrerName: rewardTransactions.referrerName,
      referrerRole: rewardTransactions.referrerRole,
      total: sql<number>`coalesce(sum(${rewardTransactions.rewardAmount}),0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(rewardTransactions)
    .groupBy(rewardTransactions.referrerUserId, rewardTransactions.referrerName, rewardTransactions.referrerRole)
    .orderBy(desc(sql`coalesce(sum(${rewardTransactions.rewardAmount}),0)`))
    .limit(10)

  const codes = await db
    .select()
    .from(referralCodes)
    .orderBy(desc(referralCodes.createdAt))
    .limit(100)

  const recentAttributions = await db
    .select()
    .from(referralAttributions)
    .orderBy(desc(referralAttributions.createdAt))
    .limit(50)

  return {
    stats: {
      codes: codeCount?.c ?? 0,
      clicks: clickCount?.c ?? 0,
      referrals: attrCount?.c ?? 0,
    },
    rewardAgg,
    leaderboard,
    codes,
    recentAttributions,
  }
}

// ---- Rewards & payouts queue ---------------------------------------------

export async function getRewardsQueue() {
  await requireRewardManager()
  const rewards = await db.select().from(rewardTransactions).orderBy(desc(rewardTransactions.createdAt)).limit(200)
  const payments = await db.select().from(rewardPayments).orderBy(desc(rewardPayments.createdAt)).limit(200)
  return { rewards, payments }
}

// Approve a reward that is eligible/under_review, moving it to `approved`.
export async function approveReward(rewardId: number) {
  const current = await requireRewardManager()
  const [reward] = await db.select().from(rewardTransactions).where(eq(rewardTransactions.id, rewardId)).limit(1)
  if (!reward) return { ok: false as const, error: "Reward not found." }
  if (!["eligible", "under_review", "pending_eligibility"].includes(reward.status)) {
    return { ok: false as const, error: `Cannot approve a reward that is ${reward.status}.` }
  }
  await db
    .update(rewardTransactions)
    .set({ status: "approved", approvedById: current.id, approvedByName: current.name ?? "", updatedAt: new Date() })
    .where(eq(rewardTransactions.id, rewardId))

  if (reward.referrerUserId) {
    await db.insert(notifications).values({
      userId: reward.referrerUserId,
      title: "Reward approved",
      body: `Your referral reward of ${reward.currency} ${reward.rewardAmount} has been approved and is queued for payout.`,
      type: "reward",
      link: "/dashboard/referrals",
    })
  }
  revalidatePath("/admin/rewards")
  revalidatePath("/dashboard/referrals")
  return { ok: true as const }
}

export async function rejectReward(rewardId: number, reason: string) {
  const current = await requireRewardManager()
  const [reward] = await db.select().from(rewardTransactions).where(eq(rewardTransactions.id, rewardId)).limit(1)
  if (!reward) return { ok: false as const, error: "Reward not found." }
  await db
    .update(rewardTransactions)
    .set({ status: "cancelled", note: reason || "Rejected", approvedById: current.id, approvedByName: current.name ?? "", updatedAt: new Date() })
    .where(eq(rewardTransactions.id, rewardId))
  revalidatePath("/admin/rewards")
  revalidatePath("/dashboard/referrals")
  return { ok: true as const }
}

// Record a payout against an approved reward.
export async function payReward(input: { rewardId: number; method: string; reference: string; adjustments?: number }) {
  const current = await requireRewardManager()
  const [reward] = await db.select().from(rewardTransactions).where(eq(rewardTransactions.id, input.rewardId)).limit(1)
  if (!reward) return { ok: false as const, error: "Reward not found." }
  if (reward.status !== "approved") {
    return { ok: false as const, error: "Only approved rewards can be paid out." }
  }
  const adjustments = Math.round(input.adjustments ?? 0)
  const gross = reward.rewardAmount
  const finalAmount = Math.max(0, gross + adjustments)

  await db.insert(rewardPayments).values({
    rewardId: reward.id,
    recipientUserId: reward.referrerUserId,
    recipientName: reward.referrerName,
    role: reward.referrerRole,
    gross,
    adjustments,
    finalAmount,
    currency: reward.currency,
    method: input.method,
    reference: input.reference,
    status: "paid",
  })
  await db
    .update(rewardTransactions)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(rewardTransactions.id, reward.id))

  if (reward.referrerUserId) {
    await db.insert(notifications).values({
      userId: reward.referrerUserId,
      title: "Reward paid",
      body: `Your referral reward of ${reward.currency} ${finalAmount} has been paid via ${input.method}.`,
      type: "reward",
      link: "/dashboard/referrals",
    })
  }
  revalidatePath("/admin/rewards")
  revalidatePath("/dashboard/referrals")
  return { ok: true as const }
}

// ---- Commission rules -----------------------------------------------------

export async function getCommissionRules() {
  await requireRewardManager()
  return db.select().from(commissionRules).orderBy(desc(commissionRules.createdAt))
}

const ALLOWED_FEES = ["admission", "annual", "renewal"] as const
const ALLOWED_REWARD_TYPES = ["percentage", "fixed", "none"] as const
const ALLOWED_STATUSES = ["draft", "active", "paused", "archived"] as const

export type CommissionRuleInput = {
  id?: number
  name: string
  referrerRole: string
  membershipCategory: string
  rewardType: string
  commissionPercent: string
  fixedAmount: number
  currency: string
  commissionableFees: string[]
  status: string
}

// Create or update a commission rule — the "allocate / change commission %"
// control used by super admins. New rewards created after this point pick up
// the change; already-created rewards keep their snapshotted rate.
export async function saveCommissionRule(input: CommissionRuleInput) {
  const current = await requireRewardManager()

  const name = (input.name ?? "").trim()
  if (!name) return { ok: false as const, error: "Give the commission a name." }

  const rewardType = ALLOWED_REWARD_TYPES.includes(input.rewardType as never) ? input.rewardType : "percentage"
  const status = ALLOWED_STATUSES.includes(input.status as never) ? input.status : "draft"

  let commissionPercent = "0"
  let fixedAmount = 0
  if (rewardType === "percentage") {
    const pct = Number.parseFloat(String(input.commissionPercent ?? "0"))
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return { ok: false as const, error: "Commission percent must be between 0 and 100." }
    }
    commissionPercent = String(pct)
  } else if (rewardType === "fixed") {
    const amt = Math.round(Number(input.fixedAmount ?? 0))
    if (!Number.isFinite(amt) || amt < 0) {
      return { ok: false as const, error: "Fixed amount must be zero or more." }
    }
    fixedAmount = amt
  }

  const fees = (input.commissionableFees ?? []).filter((f) => ALLOWED_FEES.includes(f as never))
  const commissionableFees = fees.length > 0 ? fees.join(",") : "annual"
  const currency = (input.currency ?? "PKR").trim() || "PKR"
  const referrerRole = (input.referrerRole ?? "").trim()
  const membershipCategory = (input.membershipCategory ?? "").trim()

  const values = {
    name,
    referrerRole,
    membershipCategory,
    rewardType,
    commissionPercent,
    fixedAmount,
    currency,
    commissionableFees,
    status,
    updatedAt: new Date(),
  }

  if (input.id) {
    await db.update(commissionRules).set(values).where(eq(commissionRules.id, input.id))
  } else {
    await db.insert(commissionRules).values(values)
  }

  await db.insert(notifications).values({
    role: "admin",
    type: "info",
    title: input.id ? "Commission rule updated" : "Commission rule created",
    body: `${current.name ?? "An admin"} ${input.id ? "updated" : "created"} the "${name}" commission (${
      rewardType === "percentage" ? `${commissionPercent}%` : rewardType === "fixed" ? `${currency} ${fixedAmount}` : "no reward"
    }).`,
    link: "/admin/commissions",
  })

  revalidatePath("/admin/commissions")
  return { ok: true as const }
}

export async function setCommissionRuleStatus(id: number, status: string) {
  await requireRewardManager()
  if (!ALLOWED_STATUSES.includes(status as never)) return { ok: false as const, error: "Invalid status." }
  await db.update(commissionRules).set({ status, updatedAt: new Date() }).where(eq(commissionRules.id, id))
  revalidatePath("/admin/commissions")
  return { ok: true as const }
}

export async function deleteCommissionRule(id: number) {
  await requireRewardManager()
  await db.delete(commissionRules).where(eq(commissionRules.id, id))
  revalidatePath("/admin/commissions")
  return { ok: true as const, error: undefined }
}

export async function toggleReferralCode(codeId: number, active: boolean) {
  await requireRewardManager()
  await db.update(referralCodes).set({ active }).where(eq(referralCodes.id, codeId))
  revalidatePath("/admin/referrals")
  return { ok: true as const }
}

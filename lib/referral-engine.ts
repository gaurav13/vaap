// Server-only referral / reward engine. Not a "use server" module: these are
// internal helpers invoked by other server code (application submit, admin
// approval), never called directly from the client.

import "server-only"
import { db } from "@/lib/db"
import {
  referralCodes,
  referralClicks,
  referralAttributions,
  commissionRules,
  rewardTransactions,
  notifications,
  auditLogs,
  membershipApplications,
  user,
} from "@/lib/db/schema"
import { and, desc, eq, isNull, or, lte, gte } from "drizzle-orm"
import {
  parseMoney,
  computeReward,
  type ApplicationFees,
  type CommissionRuleLike,
} from "@/lib/referral"

// --- Click tracking ---------------------------------------------------------

export async function recordReferralClick(code: string, referer = "") {
  const [row] = await db.select().from(referralCodes).where(eq(referralCodes.code, code)).limit(1)
  await db.insert(referralClicks).values({ code, codeId: row?.id ?? null, referer })
}

// A code is usable if it exists, is active, not expired, and under its cap.
export async function resolveReferralCode(code: string) {
  const [row] = await db.select().from(referralCodes).where(eq(referralCodes.code, code)).limit(1)
  if (!row || !row.active) return null
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null
  if (typeof row.maxUses === "number" && row.maxUses > 0 && row.uses >= row.maxUses) return null
  return row
}

// --- Attribution (created when an application is submitted) -----------------
// Locks the original referrer to this application. Self-referrals (referrer's
// own email applying) and duplicate attributions are rejected.

export async function createAttributionForApplication(params: {
  applicationId: number
  email: string
  code: string
}) {
  const { applicationId, email, code } = params
  const resolved = await resolveReferralCode(code)
  if (!resolved) return { ok: false as const, reason: "invalid_code" }

  // Self-referral prevention: an internal owner cannot refer their own email.
  if (resolved.ownerUserId) {
    const [owner] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, resolved.ownerUserId))
      .limit(1)
    if (owner && owner.email.toLowerCase() === email.toLowerCase()) {
      return { ok: false as const, reason: "self_referral" }
    }
  }

  // Prevent a duplicate attribution for the same application.
  const [existing] = await db
    .select()
    .from(referralAttributions)
    .where(eq(referralAttributions.applicationId, applicationId))
    .limit(1)
  if (existing) return { ok: false as const, reason: "already_attributed" }

  await db.insert(referralAttributions).values({
    code: resolved.code,
    codeId: resolved.id,
    referrerUserId: resolved.ownerUserId ?? null,
    partnerId: resolved.partnerId ?? null,
    campaignId: resolved.campaignId ?? null,
    applicationId,
    memberEmail: email.toLowerCase(),
    status: "application_submitted",
    locked: true,
  })

  await db
    .update(referralCodes)
    .set({ uses: (resolved.uses ?? 0) + 1 })
    .where(eq(referralCodes.id, resolved.id))

  return { ok: true as const }
}

// --- Commission rule matching ----------------------------------------------
// Picks the most specific active rule for (role, category, campaign). A rule
// with a blank field matches anything; more specific rules win.

export async function matchCommissionRule(params: {
  referrerRole: string
  membershipCategory: string
  campaignId?: number | null
}) {
  const now = new Date()
  const active = await db
    .select()
    .from(commissionRules)
    .where(
      and(
        eq(commissionRules.status, "active"),
        or(isNull(commissionRules.effectiveFrom), lte(commissionRules.effectiveFrom, now)),
        or(isNull(commissionRules.effectiveUntil), gte(commissionRules.effectiveUntil, now)),
      ),
    )

  const candidates = active.filter((r) => {
    if (r.referrerRole && r.referrerRole !== params.referrerRole) return false
    if (r.membershipCategory && r.membershipCategory !== params.membershipCategory) return false
    if (r.campaignId && r.campaignId !== (params.campaignId ?? null)) return false
    return true
  })

  candidates.sort((a, b) => specificity(b) - specificity(a))
  return candidates[0] ?? null
}

function specificity(r: { referrerRole: string; membershipCategory: string; campaignId: number | null }) {
  return (r.referrerRole ? 1 : 0) + (r.membershipCategory ? 1 : 0) + (r.campaignId ? 1 : 0)
}

// --- Reward creation on membership approval ---------------------------------
// CRITICAL business rule: a reward is created ONLY here, when a referred
// membership is officially approved & active. Clicks / registrations /
// submissions / partial payments never create a reward.

export async function processMembershipApproval(params: {
  email: string
  membershipId: string
  category: string
  referrerNameLookup?: (userId: string | null, partnerId: number | null) => Promise<{ name: string; role: string }>
}) {
  const email = params.email.toLowerCase()

  // Find the locked attribution for this member (by application email).
  const [attr] = await db
    .select()
    .from(referralAttributions)
    .where(eq(referralAttributions.memberEmail, email))
    .orderBy(desc(referralAttributions.createdAt))
    .limit(1)
  if (!attr) return { ok: false as const, reason: "no_attribution" }

  // Duplicate reward prevention: never create a second reward for one attribution.
  const [existingReward] = await db
    .select()
    .from(rewardTransactions)
    .where(eq(rewardTransactions.attributionId, attr.id))
    .limit(1)
  if (existingReward) {
    await db
      .update(referralAttributions)
      .set({ status: "approved", membershipId: params.membershipId, updatedAt: new Date() })
      .where(eq(referralAttributions.id, attr.id))
    return { ok: false as const, reason: "already_rewarded" }
  }

  // Pull the application fees that back the reward calculation.
  let fees: ApplicationFees = { admission: 0, annual: 0, renewal: 0 }
  if (attr.applicationId) {
    const [app] = await db
      .select()
      .from(membershipApplications)
      .where(eq(membershipApplications.id, attr.applicationId))
      .limit(1)
    if (app) {
      fees = { admission: parseMoney(app.admissionFee), annual: parseMoney(app.annualFee), renewal: 0 }
    }
  }

  // Resolve the referrer identity + role for rule matching.
  const referrer =
    (await params.referrerNameLookup?.(attr.referrerUserId, attr.partnerId)) ??
    { name: "", role: attr.partnerId ? "kol" : "staff" }

  const rule = await matchCommissionRule({
    referrerRole: referrer.role,
    membershipCategory: params.category,
    campaignId: attr.campaignId,
  })

  // Mark the attribution approved regardless of whether a rule exists.
  await db
    .update(referralAttributions)
    .set({ status: "reward_eligible", membershipId: params.membershipId, updatedAt: new Date() })
    .where(eq(referralAttributions.id, attr.id))

  if (!rule || rule.rewardType === "none") {
    // Approved but no commissionable rule — record a zero-value eligible entry
    // so it still appears in reports, with no payable amount.
    await db.insert(rewardTransactions).values({
      attributionId: attr.id,
      referrerUserId: attr.referrerUserId,
      partnerId: attr.partnerId,
      referrerName: referrer.name,
      referrerRole: referrer.role,
      memberEmail: email,
      membershipId: params.membershipId,
      membershipCategory: params.category,
      eligibleAmount: 0,
      commissionRate: rule ? "No reward" : "No matching rule",
      rewardAmount: 0,
      ruleId: rule?.id ?? null,
      ruleSnapshot: rule ? JSON.stringify(rule) : "",
      status: "eligible",
      note: rule ? "Rule set to no reward." : "No active commission rule matched at approval time.",
    })
    return { ok: true as const, reward: 0 }
  }

  const ruleLike: CommissionRuleLike = {
    rewardType: rule.rewardType,
    commissionPercent: rule.commissionPercent,
    fixedAmount: rule.fixedAmount,
    commissionableFees: rule.commissionableFees,
    currency: rule.currency,
  }
  const calc = computeReward(ruleLike, fees)

  const [reward] = await db
    .insert(rewardTransactions)
    .values({
      attributionId: attr.id,
      referrerUserId: attr.referrerUserId,
      partnerId: attr.partnerId,
      referrerName: referrer.name,
      referrerRole: referrer.role,
      memberEmail: email,
      membershipId: params.membershipId,
      membershipCategory: params.category,
      eligibleAmount: calc.eligibleAmount,
      commissionRate: calc.rate,
      rewardAmount: calc.rewardAmount,
      currency: rule.currency,
      ruleId: rule.id,
      // Snapshot the rule so future edits never rewrite this reward.
      ruleSnapshot: JSON.stringify(rule),
      status: "eligible",
    })
    .returning({ id: rewardTransactions.id })

  // Notify the referrer and flag large rewards to admins.
  if (attr.referrerUserId) {
    await db.insert(notifications).values({
      userId: attr.referrerUserId,
      type: "reward",
      title: "Referral reward is now eligible",
      body: `A membership you referred was approved. Reward ${rule.currency} ${calc.rewardAmount.toLocaleString("en-PK")} is pending review.`,
      link: "/dashboard/rewards",
    })
  }
  await db.insert(auditLogs).values({
    actorName: "System",
    action: "reward.eligible",
    target: `reward#${reward?.id} member ${email} ${rule.currency} ${calc.rewardAmount}`,
  })
  if (calc.rewardAmount >= 50000) {
    await db.insert(notifications).values({
      role: "admin",
      type: "alert",
      title: "Large referral reward created",
      body: `A reward of ${rule.currency} ${calc.rewardAmount.toLocaleString("en-PK")} became eligible for ${referrer.name || email}.`,
      link: "/admin/referrals/rewards",
    })
  }

  return { ok: true as const, reward: calc.rewardAmount }
}

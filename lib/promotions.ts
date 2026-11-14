import "server-only"

import { and, eq, gt, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { membershipPromotions } from "@/lib/db/schema"
import {
  computeDiscount,
  discountLabel,
  feeToNumber,
  type DiscountType,
  type PublicPromotion,
} from "@/lib/promotions-shared"

export type PromotionRow = typeof membershipPromotions.$inferSelect

type PricedPlan = { id: number; admissionFee: string | null; annualFee: string | null }

export type PlanPricing = {
  basePkr: number
  discountPkr: number
  finalPkr: number
  promotion: PublicPromotion | null
}

/**
 * Published promotions whose window is open at `now`. `graceMs` extends the end
 * of the window, used only when honouring a payment started during the offer.
 */
export async function getLivePromotions(now: Date = new Date(), graceMs = 0): Promise<PromotionRow[]> {
  try {
    return await db
      .select()
      .from(membershipPromotions)
      .where(
        and(
          eq(membershipPromotions.status, "published"),
          lte(membershipPromotions.startsAt, now),
          gt(membershipPromotions.endsAt, new Date(now.getTime() - graceMs)),
        ),
      )
  } catch (err) {
    // Pricing must never break the membership flow; fall back to standard prices.
    console.error("[promotions] failed to load live promotions:", err)
    return []
  }
}

/**
 * The single best promotion for a plan. Promotions never stack: when several
 * cover the same plan, the one giving the applicant the largest discount wins,
 * with the earliest-ending one breaking ties.
 */
export function pricePlan(plan: PricedPlan, promotions: PromotionRow[]): PlanPricing {
  const basePkr = feeToNumber(plan.admissionFee) + feeToNumber(plan.annualFee)
  const none: PlanPricing = { basePkr, discountPkr: 0, finalPkr: basePkr, promotion: null }
  if (basePkr <= 0) return none

  let best: { row: PromotionRow; discount: number } | null = null
  for (const row of promotions) {
    if (!row.planIds.includes(plan.id)) continue
    const discount = computeDiscount(basePkr, row.discountType as DiscountType, row.discountValue)
    if (discount <= 0) continue
    if (
      !best ||
      discount > best.discount ||
      (discount === best.discount && row.endsAt.getTime() < best.row.endsAt.getTime())
    ) {
      best = { row, discount }
    }
  }
  if (!best) return none

  const { row, discount } = best
  return {
    basePkr,
    discountPkr: discount,
    finalPkr: basePkr - discount,
    promotion: {
      id: row.id,
      name: row.name,
      description: row.description,
      discountType: row.discountType as DiscountType,
      discountValue: row.discountValue,
      label: discountLabel(row.discountType as DiscountType, row.discountValue),
      basePkr,
      discountPkr: discount,
      finalPkr: basePkr - discount,
      endsAt: row.endsAt.toISOString(),
      showCountdown: row.showCountdown,
      showBadge: row.showBadge,
    },
  }
}

/** Attach the current promotion (if any) to each plan for public display. */
export async function withPromotions<T extends PricedPlan>(
  plans: T[],
  now: Date = new Date(),
): Promise<(T & { promotion: PublicPromotion | null })[]> {
  const live = await getLivePromotions(now)
  return plans.map((plan) => ({ ...plan, promotion: pricePlan(plan, live).promotion }))
}

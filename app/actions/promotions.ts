"use server"

import { and, desc, eq, gt, isNull, lt, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { membershipPromotions } from "@/lib/db/schema"
import { logActivity, requireSuperAdmin } from "@/lib/rbac"
import {
  MAX_PERCENT_DISCOUNT,
  PROMOTION_TIME_ZONES,
  zonedLocalToUtc,
  type DiscountType,
} from "@/lib/promotions-shared"

export type PromotionInput = {
  id?: number
  name: string
  description: string
  planIds: number[]
  discountType: DiscountType
  discountValue: number
  startsLocal: string
  endsLocal: string
  timeZone: string
  showCountdown: boolean
  showBadge: boolean
}

type Result = { ok: true; id: number } | { ok: false; error: string }

function revalidatePricing() {
  revalidatePath("/membership")
  revalidatePath("/membership/apply")
  revalidatePath("/admin/membership-promotions")
}

export async function listPromotions() {
  await requireSuperAdmin()
  return db.select().from(membershipPromotions).orderBy(desc(membershipPromotions.createdAt))
}

/** Record an expiration event once for each published promotion whose window has closed. */
export async function recordPromotionExpirations() {
  const actor = await requireSuperAdmin()
  const expired = await db
    .update(membershipPromotions)
    .set({ expiredLoggedAt: new Date() })
    .where(
      and(
        eq(membershipPromotions.status, "published"),
        lt(membershipPromotions.endsAt, new Date()),
        isNull(membershipPromotions.expiredLoggedAt),
      ),
    )
    .returning({ id: membershipPromotions.id, name: membershipPromotions.name, endsAt: membershipPromotions.endsAt })
  for (const row of expired) {
    await logActivity(actor, "promotion.expired", {
      entityType: "membership_promotion",
      entityId: row.id,
      target: row.name,
      details: `Ended automatically at ${row.endsAt.toISOString()}`,
    })
  }
}

function validate(input: PromotionInput): { error: string } | { startsAt: Date; endsAt: Date } {
  if (!input.name.trim()) return { error: "Give the promotion a name." }
  if (input.name.trim().length > 120) return { error: "Keep the promotion name under 120 characters." }
  if (!input.planIds.length) return { error: "Select at least one membership plan." }
  if (!PROMOTION_TIME_ZONES.some((z) => z.value === input.timeZone)) return { error: "Choose a supported time zone." }
  if (input.discountType !== "percent" && input.discountType !== "fixed") return { error: "Choose a discount type." }
  const value = Math.round(Number(input.discountValue))
  if (!Number.isFinite(value) || value <= 0) return { error: "Enter a discount greater than zero." }
  if (input.discountType === "percent" && value > MAX_PERCENT_DISCOUNT) {
    return { error: `Percentage discounts are capped at ${MAX_PERCENT_DISCOUNT}%.` }
  }
  const startsAt = zonedLocalToUtc(input.startsLocal, input.timeZone)
  const endsAt = zonedLocalToUtc(input.endsLocal, input.timeZone)
  if (!startsAt || !endsAt) return { error: "Enter a valid start and end date and time." }
  if (endsAt <= startsAt) return { error: "The end date must be after the start date." }
  return { startsAt, endsAt }
}

/** Two published promotions may not cover the same plan at the same time. */
async function findOverlap(id: number | undefined, planIds: number[], startsAt: Date, endsAt: Date) {
  const rows = await db
    .select()
    .from(membershipPromotions)
    .where(
      and(
        eq(membershipPromotions.status, "published"),
        lt(membershipPromotions.startsAt, endsAt),
        gt(membershipPromotions.endsAt, startsAt),
        id ? ne(membershipPromotions.id, id) : undefined,
      ),
    )
  return rows.find((r) => r.planIds.some((p) => planIds.includes(p))) ?? null
}

export async function savePromotion(input: PromotionInput, mode: "draft" | "publish"): Promise<Result> {
  const actor = await requireSuperAdmin()
  const checked = validate(input)
  if ("error" in checked) return { ok: false, error: checked.error }
  const { startsAt, endsAt } = checked

  if (mode === "publish") {
    if (endsAt <= new Date()) return { ok: false, error: "This end date has already passed. Choose a future end date to publish." }
    const clash = await findOverlap(input.id, input.planIds, startsAt, endsAt)
    if (clash) {
      return {
        ok: false,
        error: `"${clash.name}" already discounts one of these plans during this period. Adjust the dates or plans, or pause it first.`,
      }
    }
  }

  const values = {
    name: input.name.trim(),
    description: input.description.trim().slice(0, 500),
    planIds: [...new Set(input.planIds.map(Number))],
    discountType: input.discountType,
    discountValue: Math.round(Number(input.discountValue)),
    startsAt,
    endsAt,
    timeZone: input.timeZone,
    showCountdown: input.showCountdown,
    showBadge: input.showBadge,
    updatedBy: actor.id,
    updatedAt: new Date(),
    ...(mode === "publish" ? { status: "published", expiredLoggedAt: null } : {}),
  }

  let id = input.id
  if (id) {
    const [existing] = await db.select().from(membershipPromotions).where(eq(membershipPromotions.id, id)).limit(1)
    if (!existing) return { ok: false, error: "This promotion no longer exists." }
    await db.update(membershipPromotions).set(values).where(eq(membershipPromotions.id, id))
    await logActivity(actor, mode === "publish" ? "promotion.publish" : "promotion.update", {
      entityType: "membership_promotion",
      entityId: id,
      target: values.name,
      details: JSON.stringify({ before: existing, after: values }).slice(0, 2000),
    })
  } else {
    const [row] = await db
      .insert(membershipPromotions)
      .values({ ...values, status: mode === "publish" ? "published" : "draft", createdBy: actor.id })
      .returning({ id: membershipPromotions.id })
    id = row.id
    await logActivity(actor, "promotion.create", { entityType: "membership_promotion", entityId: id, target: values.name })
    if (mode === "publish") {
      await logActivity(actor, "promotion.publish", { entityType: "membership_promotion", entityId: id, target: values.name })
    }
  }

  revalidatePricing()
  return { ok: true, id }
}

export async function setPromotionStatus(id: number, action: "pause" | "resume" | "deactivate"): Promise<Result> {
  const actor = await requireSuperAdmin()
  const [row] = await db.select().from(membershipPromotions).where(eq(membershipPromotions.id, id)).limit(1)
  if (!row) return { ok: false, error: "This promotion no longer exists." }

  if (action === "resume") {
    if (row.endsAt <= new Date()) return { ok: false, error: "This promotion has already ended. Edit the end date to run it again." }
    const clash = await findOverlap(id, row.planIds, row.startsAt, row.endsAt)
    if (clash) return { ok: false, error: `"${clash.name}" already discounts one of these plans during this period.` }
  }

  const status = action === "pause" ? "paused" : action === "resume" ? "published" : "ended"
  await db.update(membershipPromotions).set({ status, updatedBy: actor.id, updatedAt: new Date() }).where(eq(membershipPromotions.id, id))
  await logActivity(actor, `promotion.${action}`, { entityType: "membership_promotion", entityId: id, target: row.name })
  revalidatePricing()
  return { ok: true, id }
}

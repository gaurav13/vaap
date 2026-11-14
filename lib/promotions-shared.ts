// Client-safe promotion helpers. Pricing authority lives on the server
// (lib/promotions.ts); these functions only describe and format it.

export type DiscountType = "percent" | "fixed"
export type StoredPromotionStatus = "draft" | "published" | "paused" | "ended"
export type PromotionStatus = "draft" | "scheduled" | "active" | "expired" | "paused"

/**
 * After a promotion ends, payments already in progress are still honoured for
 * this long: a card session started during the offer keeps its price for its
 * full 30-minute lifetime, and a crypto payment made during the offer can still
 * be submitted. New checkouts never see the discount once it has ended.
 */
export const CHECKOUT_GRACE_MINUTES = 30
export const CHECKOUT_GRACE_MS = CHECKOUT_GRACE_MINUTES * 60 * 1000

/** Never discount below 5% of the base price, so a typo can't make a plan free. */
export const MAX_PERCENT_DISCOUNT = 95
const MIN_PAYABLE_RATIO = 0.05

export const PROMOTION_TIME_ZONES = [
  { value: "Asia/Karachi", label: "Pakistan (PKT, UTC+5)" },
  { value: "UTC", label: "UTC" },
  { value: "Asia/Dubai", label: "Dubai (GST, UTC+4)" },
  { value: "Asia/Singapore", label: "Singapore (SGT, UTC+8)" },
  { value: "Europe/London", label: "London (UK)" },
  { value: "America/New_York", label: "New York (US Eastern)" },
] as const

export const STATUS_LABELS: Record<PromotionStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  expired: "Expired",
  paused: "Paused",
}

/** Promotion data that is safe to send to the browser. */
export type PublicPromotion = {
  id: number
  name: string
  description: string
  discountType: DiscountType
  discountValue: number
  label: string
  basePkr: number
  discountPkr: number
  finalPkr: number
  endsAt: string
  showCountdown: boolean
  showBadge: boolean
}

export function effectiveStatus(
  row: { status: string; startsAt: Date | string; endsAt: Date | string },
  now: Date = new Date(),
): PromotionStatus {
  if (row.status === "draft") return "draft"
  if (row.status === "paused") return "paused"
  if (row.status === "ended") return "expired"
  const t = now.getTime()
  if (t < new Date(row.startsAt).getTime()) return "scheduled"
  if (t >= new Date(row.endsAt).getTime()) return "expired"
  return "active"
}

export function computeDiscount(basePkr: number, type: DiscountType, value: number): number {
  if (basePkr <= 0 || value <= 0) return 0
  const raw = type === "percent" ? Math.round((basePkr * Math.min(value, MAX_PERCENT_DISCOUNT)) / 100) : Math.round(value)
  const maxDiscount = Math.floor(basePkr * (1 - MIN_PAYABLE_RATIO))
  return Math.max(0, Math.min(raw, maxDiscount))
}

export function discountLabel(type: DiscountType, value: number): string {
  return type === "percent" ? `${value}% OFF` : `PKR ${value.toLocaleString("en-US")} OFF`
}

export function formatPKR(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString("en-US")}`
}

export function feeToNumber(value: string | null | undefined): number {
  const digits = (value ?? "").replace(/[^\d]/g, "")
  return digits ? Number.parseInt(digits, 10) : 0
}

// --- Time zone conversion (no dependency) ---------------------------------

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  return asUtc - utcMs
}

/** Convert a wall-clock "YYYY-MM-DDTHH:mm" in `timeZone` to a UTC Date. */
export function zonedLocalToUtc(local: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local)
  if (!m) return null
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
  let utc = wall - zoneOffsetMs(wall, timeZone)
  // Re-check once in case the guess crossed a DST boundary.
  utc = wall - zoneOffsetMs(utc, timeZone)
  return new Date(utc)
}

/** Format a UTC instant as "YYYY-MM-DDTHH:mm" wall-clock time in `timeZone`. */
export function utcToZonedLocal(date: Date | string, timeZone: string): string {
  const d = new Date(date)
  const shifted = new Date(d.getTime() + zoneOffsetMs(d.getTime(), timeZone))
  return shifted.toISOString().slice(0, 16)
}

export function formatInZone(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(date))
}

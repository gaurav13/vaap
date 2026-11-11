import "server-only"

import { createHash } from "node:crypto"
import { pool } from "@/lib/db"
import { getMembershipStanding, isApplicationPaymentConfirmed } from "@/lib/membership-state"
import type { AiSettings, UsageState, UsageTier } from "./config"

// --- Calendar day in the configured reset time zone ------------------------------

function zonedParts(at: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute"), s: get("second") }
}

function offsetMs(at: Date, tz: string) {
  const p = zonedParts(at, tz)
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(at.getTime() / 1000) * 1000
}

/** UTC instant of 00:00 local time on the given local date (handles DST by re-checking the offset). */
function zonedMidnight(y: number, m: number, d: number, tz: string) {
  const guess = Date.UTC(y, m - 1, d)
  const first = guess - offsetMs(new Date(guess), tz)
  return new Date(guess - offsetMs(new Date(first), tz))
}

export function usagePeriod(tz: string, now = new Date()) {
  const p = zonedParts(now, tz)
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    dayKey: `${p.y}-${pad(p.m)}-${pad(p.d)}`,
    monthKey: `${p.y}-${pad(p.m)}`,
    dayStart: zonedMidnight(p.y, p.m, p.d, tz),
    monthStart: zonedMidnight(p.y, p.m, 1, tz),
    resetAt: zonedMidnight(p.y, p.m, p.d + 1, tz),
  }
}

export function timeZoneLabel(tz: string) {
  if (tz === "Asia/Karachi") return "Pakistan time"
  return tz.replace(/_/g, " ")
}

// --- Who is asking ---------------------------------------------------------------

export type Viewer = { id: string; email: string } | null

const tierCache = new Map<string, { tier: UsageTier; at: number }>()
const TIER_TTL_MS = 2 * 60 * 1000

/**
 * Paid tiers need an issued, active, unexpired member record AND an approved
 * application whose payment is confirmed (Stripe for card, Super Admin for crypto).
 * A submitted or unpaid application never unlocks a higher allowance.
 */
export async function resolveTier(viewer: Viewer): Promise<UsageTier> {
  if (!viewer) return "guest"
  const cached = tierCache.get(viewer.id)
  if (cached && Date.now() - cached.at < TIER_TTL_MS) return cached.tier

  let tier: UsageTier = "registered"
  try {
    const standing = await getMembershipStanding(viewer.id, viewer.email)
    const app = standing.application
    if (standing.state === "active" && standing.member && app?.status === "approved" && (await isApplicationPaymentConfirmed(app))) {
      tier = /corporate/i.test(standing.member.category) ? "corporate" : "professional"
    }
  } catch (err) {
    console.error("[ai-usage] tier lookup failed:", err instanceof Error ? err.message : err)
  }
  tierCache.set(viewer.id, { tier, at: Date.now() })
  return tier
}

export function limitFor(tier: UsageTier, s: AiSettings) {
  switch (tier) {
    case "guest":
      return s.guestDailyQuestions ?? s.freeDailyQuestions
    case "registered":
      return s.registeredDailyQuestions ?? s.freeDailyQuestions
    case "professional":
      return s.professionalDailyQuestions
    case "corporate":
      return s.corporateDailyQuestions
  }
}

export function subjectFor(viewer: Viewer, sessionId: string) {
  return viewer ? `user:${viewer.id}` : `guest:${sessionId}`
}

/** Salted hash so raw IP addresses are never stored. */
export function ipSubject(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || ""
  if (!ip) return null
  const salt = process.env.BETTER_AUTH_SECRET ?? "vaap"
  return `ip:${createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32)}`
}

// --- Atomic counter --------------------------------------------------------------

/**
 * Increments the counter only while it is below the limit, in one statement.
 * Postgres row locking on the conflict target makes concurrent requests
 * serialize, so N parallel requests can never accept more than `limit`.
 */
async function increment(subject: string, dayKey: string, tier: UsageTier, limit: number) {
  if (limit <= 0) return false
  const { rows } = await pool.query<{ count: number }>(
    `insert into ai_daily_usage (subject, day, count, tier, "dailyLimit", "updatedAt")
     values ($1, $2, 1, $3, $4, now())
     on conflict (subject, day) do update
       set count = ai_daily_usage.count + 1, tier = excluded.tier, "dailyLimit" = excluded."dailyLimit", "updatedAt" = now()
       where ai_daily_usage.count < $4
     returning count`,
    [subject, dayKey, tier, limit],
  )
  return rows.length > 0
}

async function decrement(subject: string, dayKey: string) {
  await pool.query(`update ai_daily_usage set count = greatest(count - 1, 0), "updatedAt" = now() where subject = $1 and day = $2`, [
    subject,
    dayKey,
  ])
}

async function markBlocked(subject: string, dayKey: string, tier: UsageTier, limit: number) {
  await pool
    .query(
      `insert into ai_daily_usage (subject, day, count, blocked, tier, "dailyLimit") values ($1, $2, 0, 1, $3, $4)
       on conflict (subject, day) do update set blocked = ai_daily_usage.blocked + 1, "updatedAt" = now()`,
      [subject, dayKey, tier, limit],
    )
    .catch(() => {})
}

export type QuestionTicket = {
  subject: string
  ip: string | null
  dayKey: string
  tier: UsageTier
  refund: () => Promise<void>
}

export type ConsumeResult =
  | { ok: true; ticket: QuestionTicket; state: UsageState }
  | { ok: false; reason: "daily" | "monthly" | "spend"; state: UsageState }

type Ctx = { viewer: Viewer; sessionId: string; ip: string | null; settings: AiSettings; now?: Date }

async function readCounts(subjects: string[], dayKey: string) {
  const { rows } = await pool.query<{ subject: string; count: number }>(
    `select subject, count from ai_daily_usage where day = $1 and subject = any($2)`,
    [dayKey, subjects],
  )
  return new Map(rows.map((r) => [r.subject, r.count]))
}

function buildState(tier: UsageTier, viewer: Viewer, limit: number, used: number, resetAt: Date, s: AiSettings): UsageState {
  const capped = Math.min(used, limit)
  return {
    tier,
    signedIn: Boolean(viewer),
    limit,
    used: capped,
    remaining: Math.max(0, limit - capped),
    resetAt: resetAt.toISOString(),
    resetLabel: timeZoneLabel(s.resetTimezone),
    resetTimeZone: s.resetTimezone,
    paidUpgradesEnabled: s.paidUpgradesEnabled,
  }
}

/** Current allowance without consuming anything. */
export async function getUsageState({ viewer, sessionId, ip, settings, now }: Ctx): Promise<UsageState> {
  const tier = await resolveTier(viewer)
  const limit = limitFor(tier, settings)
  const period = usagePeriod(settings.resetTimezone, now)
  const subject = subjectFor(viewer, sessionId)
  const counts = await readCounts(ip && !viewer ? [subject, ip] : [subject], period.dayKey)
  let used = counts.get(subject) ?? 0
  // A guest sharing an exhausted IP allowance sees the stricter of the two.
  if (!viewer && ip && (counts.get(ip) ?? 0) >= settings.guestIpDailyQuestions) used = limit
  return buildState(tier, viewer, limit, used, period.resetAt, settings)
}

/**
 * Validates and reserves one question for this request. Must run before any paid
 * AI call. The returned ticket refunds the question if the request is not answered.
 */
export async function consumeQuestion({ viewer, sessionId, ip, settings, now }: Ctx): Promise<ConsumeResult> {
  const tier = await resolveTier(viewer)
  const limit = limitFor(tier, settings)
  const period = usagePeriod(settings.resetTimezone, now)
  const subject = subjectFor(viewer, sessionId)
  const guestIp = viewer ? null : ip

  const blocked = async (reason: "daily" | "monthly" | "spend", used: number) => {
    await markBlocked(subject, period.dayKey, tier, limit)
    return { ok: false as const, reason, state: buildState(tier, viewer, limit, used, period.resetAt, settings) }
  }

  const { rows } = await pool.query<{ month: string; spent: string }>(
    `select
       (select coalesce(sum(count), 0) from ai_daily_usage where subject = $1 and day >= $2) as month,
       (select coalesce(sum(coalesce("actualCostMicroUsd", "costMicroUsd")), 0) from ai_usage_logs
         where ${viewer ? `"userId" = $3` : `"sessionId" = $3`} and "createdAt" >= ($4::timestamptz at time zone 'UTC')) as spent`,
    [subject, `${period.monthKey}-01`, viewer ? viewer.id : sessionId, period.dayStart.toISOString()],
  )
  const current = (await readCounts([subject], period.dayKey)).get(subject) ?? 0
  if (viewer && Number(rows[0].month) >= settings.userMonthlyRequests) return blocked("monthly", current)
  if (settings.userDailySpendUsd > 0 && Number(rows[0].spent) >= settings.userDailySpendUsd * 1_000_000) {
    return blocked("spend", limit)
  }

  if (!(await increment(subject, period.dayKey, tier, limit))) return blocked("daily", limit)
  if (guestIp && !(await increment(guestIp, period.dayKey, "guest", settings.guestIpDailyQuestions))) {
    await decrement(subject, period.dayKey)
    return blocked("daily", limit)
  }

  let refunded = false
  const ticket: QuestionTicket = {
    subject,
    ip: guestIp,
    dayKey: period.dayKey,
    tier,
    refund: async () => {
      if (refunded) return
      refunded = true
      await decrement(subject, period.dayKey).catch(() => {})
      if (guestIp) await decrement(guestIp, period.dayKey).catch(() => {})
    },
  }
  const used = (await readCounts([subject], period.dayKey)).get(subject) ?? 1
  return { ok: true, ticket, state: buildState(tier, viewer, limit, used, period.resetAt, settings) }
}

export function limitMessage(state: UsageState, reason: "daily" | "monthly" | "spend") {
  const reset = `${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: state.resetTimeZone }).format(new Date(state.resetAt))}`
  const free = state.tier === "guest" || state.tier === "registered"
  const lines =
    reason === "monthly"
      ? ["**You've reached this month's Ask VAAP AI limit.**", "Your allowance will be available again next month."]
      : [
          "**You've reached your daily Ask VAAP AI limit.**",
          free
            ? `You've used all ${state.limit} free questions available today.`
            : `You've used all ${state.limit} questions included with your membership today.`,
          `Your ${free ? "free " : ""}allowance will reset tomorrow at 12:00 AM ${state.resetLabel} (${reset}).`,
        ]
  if (free && state.paidUpgradesEnabled) {
    lines.push("To continue using Ask VAAP AI with additional questions, upgrade to an eligible paid VAAP membership.")
  }
  if (!state.signedIn) lines.push("Signing in keeps your allowance with your account across devices.")
  return lines.join("\n\n")
}

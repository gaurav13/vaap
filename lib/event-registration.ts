import "server-only"
import crypto from "crypto"
import { and, eq, gt, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { eventRsvps, events } from "@/lib/db/schema"
import { appBaseUrl, sendTemplateEmail } from "@/lib/email-templates/service"
import { claimEmailOnce, registrationConfirmedKey } from "@/lib/email-dedupe"
import { eventPath } from "@/lib/event-slug"
import { createToken, readSignedToken } from "@/lib/email-tokens"

export type EventRow = typeof events.$inferSelect
export type RsvpRow = typeof eventRsvps.$inferSelect
export type RsvpStatus = "pending" | "confirmed" | "cancelled"

const HOUR = 60 * 60 * 1000
export const VERIFY_TTL_MS = 24 * HOUR
/** Minimum gap between two verification emails for the same registration. */
const RESEND_COOLDOWN_MS = 60 * 1000
/** Verification emails per registration in a rolling 24h window. */
const MAX_SENDS_PER_DAY = 5
/** Verification emails to one address across all events per hour, so a form can't be used to flood an inbox. */
const MAX_SENDS_PER_ADDRESS_PER_HOUR = 6

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 200)
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function formatEventDate(ev: Pick<EventRow, "startsAt" | "timeLabel">) {
  const date = ev.startsAt.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Karachi",
  })
  return ev.timeLabel ? `${date} · ${ev.timeLabel}` : date
}

export function eventEmailVars(ev: EventRow, name: string) {
  return {
    name,
    eventTitle: ev.title,
    eventDate: formatEventDate(ev),
    eventLocation: ev.location || "To be announced",
    eventUrl: `${appBaseUrl()}${eventPath(ev)}`,
  }
}

export type SendVerificationResult =
  | { ok: true }
  | { ok: false; reason: "cooldown"; retryAfterSec: number }
  | { ok: false; reason: "limit" | "email" }

/**
 * Issues a fresh single-use token (invalidating any earlier link) and emails it.
 * Rate limits are enforced per registration and per address.
 */
export async function sendVerification(rsvp: RsvpRow, ev: EventRow): Promise<SendVerificationResult> {
  const now = Date.now()

  if (rsvp.verifyLastSentAt) {
    const elapsed = now - rsvp.verifyLastSentAt.getTime()
    if (elapsed < RESEND_COOLDOWN_MS) {
      return { ok: false, reason: "cooldown", retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000) }
    }
  }

  const windowStart = rsvp.verifyWindowStartedAt?.getTime()
  const inWindow = windowStart !== undefined && now - windowStart < 24 * HOUR
  const sendsInWindow = inWindow ? rsvp.verifySendCount : 0
  if (sendsInWindow >= MAX_SENDS_PER_DAY) return { ok: false, reason: "limit" }

  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(eventRsvps)
    .where(and(eq(eventRsvps.email, rsvp.email), gt(eventRsvps.verifyLastSentAt, new Date(now - HOUR))))
  if ((recent?.n ?? 0) >= MAX_SENDS_PER_ADDRESS_PER_HOUR) return { ok: false, reason: "limit" }

  // Signed link bound to this registration: every link sent in the last 24h stays valid,
  // so registering twice or resending never breaks an earlier email.
  const token = createToken("rsvp", rsvp.email, { id: rsvp.id, ttlDays: VERIFY_TTL_MS / (24 * HOUR) })
  // Conditioned on the send count we read, so two concurrent requests can't both slip under the limit.
  const updated = await db
    .update(eventRsvps)
    .set({
      verifyTokenHash: hashToken(token),
      verifyExpiresAt: new Date(now + VERIFY_TTL_MS),
      verifyLastSentAt: new Date(now),
      verifySendCount: sendsInWindow + 1,
      verifyWindowStartedAt: new Date(inWindow ? windowStart : now),
    })
    .where(and(eq(eventRsvps.id, rsvp.id), eq(eventRsvps.verifySendCount, rsvp.verifySendCount)))
    .returning({ id: eventRsvps.id })
  if (updated.length === 0) return { ok: false, reason: "cooldown", retryAfterSec: 60 }

  const sent = await sendTemplateEmail({
    to: rsvp.email,
    key: "event.registration-verify",
    vars: { ...eventEmailVars(ev, rsvp.name), url: `${appBaseUrl()}/rsvp/confirm?token=${token}` },
  })
  return sent ? { ok: true } : { ok: false, reason: "email" }
}

/** Sends the attendee confirmation at most once per registration. */
export async function sendConfirmedEmail(rsvp: Pick<RsvpRow, "id" | "email" | "name">, ev: EventRow) {
  let release: (() => Promise<void>) | null = null
  try {
    release = await claimEmailOnce("event.registration-confirmed", registrationConfirmedKey(rsvp.id), rsvp.email)
    if (!release) return
    const ok = await sendTemplateEmail({ to: rsvp.email, key: "event.registration-confirmed", vars: eventEmailVars(ev, rsvp.name) })
    if (!ok) await release()
  } catch (err) {
    if (release) await release().catch(() => {})
    console.error("[event-registration] confirmation email failed:", err instanceof Error ? err.message : err)
  }
}

export type TokenState =
  | { state: "invalid" }
  | { state: "used"; event: EventRow }
  | { state: "expired"; event: EventRow; email: string }
  | { state: "valid"; event: EventRow; name: string; email: string }

/** Looks a token up without consuming it, so email link scanners that prefetch the URL can't burn it. */
async function resolveToken(token: string | undefined | null) {
  if (!token || token.length > 2000) return null
  const signed = readSignedToken(token, "rsvp")
  if (signed) {
    const id = Number.parseInt(signed.id ?? "", 10)
    if (!Number.isFinite(id)) return null
    const [row] = await db
      .select({ rsvp: eventRsvps, event: events })
      .from(eventRsvps)
      .innerJoin(events, eq(events.id, eventRsvps.eventId))
      .where(and(eq(eventRsvps.id, id), eq(eventRsvps.email, signed.email)))
      .limit(1)
    return row ? { ...row, expired: signed.expired } : null
  }
  // Links sent before signed tokens were introduced.
  if (token.length > 200) return null
  const [row] = await db
    .select({ rsvp: eventRsvps, event: events })
    .from(eventRsvps)
    .innerJoin(events, eq(events.id, eventRsvps.eventId))
    .where(eq(eventRsvps.verifyTokenHash, hashToken(token)))
    .limit(1)
  if (!row) return null
  return { ...row, expired: !row.rsvp.verifyExpiresAt || row.rsvp.verifyExpiresAt.getTime() < Date.now() }
}

export async function inspectToken(token: string | undefined | null): Promise<TokenState> {
  const row = await resolveToken(token)
  if (!row) return { state: "invalid" }
  if (row.rsvp.status === "confirmed") return { state: "used", event: row.event }
  if (row.rsvp.status !== "pending") return { state: "invalid" }
  if (row.expired) return { state: "expired", event: row.event, email: row.rsvp.email }
  return { state: "valid", event: row.event, name: row.rsvp.name, email: row.rsvp.email }
}

/** Atomically consumes a token: only one request can flip a pending row to confirmed. */
export async function consumeToken(token: string): Promise<{ ok: true; event: EventRow } | { ok: false }> {
  const row = await resolveToken(token)
  if (!row || row.expired) return { ok: false }
  const [rsvp] = await db
    .update(eventRsvps)
    .set({ status: "confirmed", verifiedAt: new Date(), verifyTokenHash: null, verifyExpiresAt: null, cancelledAt: null })
    .where(and(eq(eventRsvps.id, row.rsvp.id), eq(eventRsvps.status, "pending")))
    .returning()
  if (!rsvp) return { ok: false }
  const [ev] = await db.select().from(events).where(eq(events.id, rsvp.eventId)).limit(1)
  if (!ev) return { ok: false }
  await sendConfirmedEmail(rsvp, ev)
  return { ok: true, event: ev }
}

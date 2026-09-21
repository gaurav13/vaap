"use server"

import { db } from "@/lib/db"
import { news, events, eventRsvps, membershipApplications, contactMessages, user } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { desc, eq, gte, and, isNotNull, sql } from "drizzle-orm"
import { headers, cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createAttributionForApplication } from "@/lib/referral-engine"

export type CryptoRates = {
  usdPerPkr: number
  xrpPerPkr: number
  source: "live" | "fallback"
}

// Indicative fallback used when the live rate service is unreachable.
const FALLBACK_PKR_PER_USD = 280
const FALLBACK_XRP_USD = 2.5

export async function getCryptoRates(): Promise<CryptoRates> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd,pkr",
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) },
    )
    if (res.ok) {
      const data = (await res.json()) as { ripple?: { usd?: number; pkr?: number } }
      const xrpUsd = data?.ripple?.usd
      const xrpPkr = data?.ripple?.pkr
      if (xrpUsd && xrpPkr) {
        return {
          usdPerPkr: xrpUsd / xrpPkr, // (USD per XRP) / (PKR per XRP) = USD per PKR
          xrpPerPkr: 1 / xrpPkr, // XRP per PKR
          source: "live",
        }
      }
    }
  } catch {
    // fall through to indicative rate
  }
  return {
    usdPerPkr: 1 / FALLBACK_PKR_PER_USD,
    xrpPerPkr: 1 / (FALLBACK_PKR_PER_USD * FALLBACK_XRP_USD),
    source: "fallback",
  }
}

export async function getPublishedNews(limit?: number) {
  const rows = await db.select().from(news).where(eq(news.published, true)).orderBy(desc(news.createdAt))
  return typeof limit === "number" ? rows.slice(0, limit) : rows
}

export async function getCommitteeNews(limit?: number) {
  const rows = await db
    .select()
    .from(news)
    .where(and(eq(news.published, true), isNotNull(news.committeeId)))
    .orderBy(desc(news.createdAt))
  return typeof limit === "number" ? rows.slice(0, limit) : rows
}

export async function getPublishedEvents(limit?: number) {
  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.published, true),
        eq(events.status, "approved"),
        gte(events.startsAt, new Date(Date.now() - 1000 * 60 * 60 * 24)),
      ),
    )
    .orderBy(events.startsAt)
  return typeof limit === "number" ? rows.slice(0, limit) : rows
}

export async function getEventById(id: number) {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.published, true), eq(events.status, "approved")))
    .limit(1)
  return rows[0] ?? null
}

export async function getEventRsvps(eventId: number) {
  return db
    .select({
      id: eventRsvps.id,
      name: eventRsvps.name,
      createdAt: eventRsvps.createdAt,
    })
    .from(eventRsvps)
    .where(eq(eventRsvps.eventId, eventId))
    .orderBy(eventRsvps.createdAt)
}

export async function getEventRsvpCount(eventId: number) {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventRsvps)
    .where(eq(eventRsvps.eventId, eventId))
  return rows[0]?.count ?? 0
}

/**
 * Register an attendee for an event (Luma-style). Works for guests and
 * signed-in members alike; a signed-in user's id is attached when present.
 * Duplicate RSVPs (same email for the same event) are treated as success.
 */
export async function rsvpToEvent(formData: FormData) {
  const eventId = Number.parseInt(String(formData.get("eventId") ?? ""), 10)
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()

  if (!Number.isFinite(eventId)) return { ok: false, error: "Invalid event." }
  if (!name) return { ok: false, error: "Please enter your name." }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Please enter a valid email address." }

  // Only allow RSVPs to a live, approved event.
  const ev = await getEventById(eventId)
  if (!ev) return { ok: false, error: "This event is no longer available." }

  let userId: string | null = null
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    userId = session?.user?.id ?? null
  } catch {
    userId = null
  }

  try {
    await db
      .insert(eventRsvps)
      .values({ eventId, userId, name, email })
      .onConflictDoNothing()
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not register." }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/events")
  return { ok: true }
}

export async function submitMembershipApplication(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const organization = String(formData.get("organization") ?? "").trim()
  const category = String(formData.get("category") ?? "Corporate Members")
  const message = String(formData.get("message") ?? "").trim()

  if (!name || !email) {
    return { ok: false, error: "Name and email are required." }
  }

  await db.insert(membershipApplications).values({
    name,
    email,
    organization: organization || null,
    category,
    message,
  })

  return { ok: true }
}

export type ApplicationInput = {
  // Set when a draft (incomplete) record already exists for this applicant, so
  // we complete that row instead of creating a duplicate.
  applicationId?: number | null
  category: string
  name: string
  email: string
  organization?: string
  registrationNumber?: string
  website?: string
  industrySector?: string
  designation?: string
  phone?: string
  cnic?: string
  paymentMethod?: string
  txid?: string
  admissionFee?: string
  annualFee?: string
  totalAmount?: string
  // Referral code captured from a /join?ref= link (or the vaap_ref cookie).
  refCode?: string
}

export type IncompleteInput = {
  applicationId?: number | null
  category: string
  name: string
  email: string
  organization?: string
  registrationNumber?: string
  website?: string
  industrySector?: string
  designation?: string
  phone?: string
  cnic?: string
  paymentMethod?: string
  admissionFee?: string
  annualFee?: string
  totalAmount?: string
}

function clean(value: string | undefined): string {
  return (value ?? "").trim()
}

function buildReference(id: number, createdAt?: Date | null): string {
  const year = new Date(createdAt ?? Date.now()).getFullYear()
  return `VAAP-${year}-${String(id).padStart(6, "0")}`
}

function generateTempPassword(): string {
  const rand = () => Math.random().toString(36).slice(2, 8)
  // Mixed case + digits to satisfy common password rules; shown once to the applicant.
  return `Vaap-${rand()}${rand().toUpperCase()}`
}

// Creates a Better Auth login for the applicant so they immediately get member
// access. Idempotent: skips silently if an account with this email exists.
// Role defaults to "member" (roles are never settable at sign-up).
async function provisionMemberAccount(
  name: string,
  email: string,
): Promise<{ created: boolean; tempPassword?: string }> {
  try {
    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
    if (existing) return { created: false }
    const tempPassword = generateTempPassword()
    await auth.api.signUpEmail({ body: { name, email, password: tempPassword } })
    return { created: true, tempPassword }
  } catch {
    // Never block application submission on account creation.
    return { created: false }
  }
}

// Persists the applicant's basic details (name, email, phone, CNIC) as an
// INCOMPLETE application the moment they finish the Information step. If they
// abandon the flow at the payment stage, this row remains so the admin team can
// follow up. Returns the row id so a later full submit completes the same row.
export async function saveIncompleteApplication(input: IncompleteInput) {
  const name = clean(input.name)
  const email = clean(input.email)
  const category = clean(input.category) || "Corporate Membership"

  if (!name || !email) return { ok: false as const }

  const values = {
    name,
    email,
    category,
    organization: clean(input.organization) || null,
    registrationNumber: clean(input.registrationNumber) || null,
    website: clean(input.website) || null,
    industrySector: clean(input.industrySector) || null,
    designation: clean(input.designation) || null,
    phone: clean(input.phone) || null,
    cnic: clean(input.cnic) || null,
    paymentMethod: clean(input.paymentMethod) || null,
    admissionFee: clean(input.admissionFee) || null,
    annualFee: clean(input.annualFee) || null,
    totalAmount: clean(input.totalAmount) || null,
    message: `Incomplete application for ${category} — stopped before final submit.`,
  }

  try {
    if (input.applicationId) {
      // Only refresh rows that are still incomplete; never touch a finished one.
      await db
        .update(membershipApplications)
        .set(values)
        .where(
          and(eq(membershipApplications.id, input.applicationId), eq(membershipApplications.completed, false)),
        )
      revalidatePath("/admin/applications")
      return { ok: true as const, applicationId: input.applicationId }
    }

    const [inserted] = await db
      .insert(membershipApplications)
      .values({ ...values, completed: false, status: "pending" })
      .returning({ id: membershipApplications.id, createdAt: membershipApplications.createdAt })

    const reference = buildReference(inserted.id, inserted.createdAt)
    await db
      .update(membershipApplications)
      .set({ reference })
      .where(eq(membershipApplications.id, inserted.id))

    revalidatePath("/admin/applications")
    return { ok: true as const, applicationId: inserted.id, reference }
  } catch {
    return { ok: false as const }
  }
}

// Full multi-step membership application submitted from /membership/apply.
// Card / crypto card details are intentionally never persisted — only the
// chosen payment method and (for crypto) the transaction ID are stored.
// Completing an application also provisions the applicant a member login.
export async function submitFullApplication(input: ApplicationInput) {
  const name = clean(input.name)
  const email = clean(input.email)
  const category = clean(input.category) || "Corporate Membership"

  if (!name || !email) {
    return { ok: false as const, error: "Full name and email address are required." }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "Please enter a valid email address." }
  }

  const values = {
    name,
    email,
    category,
    organization: clean(input.organization) || null,
    registrationNumber: clean(input.registrationNumber) || null,
    website: clean(input.website) || null,
    industrySector: clean(input.industrySector) || null,
    designation: clean(input.designation) || null,
    phone: clean(input.phone) || null,
    cnic: clean(input.cnic) || null,
    paymentMethod: clean(input.paymentMethod) || null,
    txid: clean(input.txid) || null,
    admissionFee: clean(input.admissionFee) || null,
    annualFee: clean(input.annualFee) || null,
    totalAmount: clean(input.totalAmount) || null,
    message: `Application for ${category}.`,
    completed: true,
  }

  try {
    let reference: string | null = null

    if (input.applicationId) {
      // Complete the existing draft row rather than duplicating it.
      await db
        .update(membershipApplications)
        .set(values)
        .where(eq(membershipApplications.id, input.applicationId))

      const [row] = await db
        .select({ reference: membershipApplications.reference, createdAt: membershipApplications.createdAt })
        .from(membershipApplications)
        .where(eq(membershipApplications.id, input.applicationId))
        .limit(1)

      reference = row?.reference ?? null
      if (!reference) {
        reference = buildReference(input.applicationId, row?.createdAt)
        await db
          .update(membershipApplications)
          .set({ reference })
          .where(eq(membershipApplications.id, input.applicationId))
      }
    } else {
      const [inserted] = await db
        .insert(membershipApplications)
        .values(values)
        .returning({ id: membershipApplications.id, createdAt: membershipApplications.createdAt })

      reference = buildReference(inserted.id, inserted.createdAt)
      await db
        .update(membershipApplications)
        .set({ reference })
        .where(eq(membershipApplications.id, inserted.id))
    }

    const account = await provisionMemberAccount(name, email)

    // Lock referral attribution (if any) to this application. The code arrives
    // either from the form or the `vaap_ref` cookie set by a /join?ref= link.
    // A reward is NOT created here — only later, on official approval.
    try {
      const cookieStore = await cookies()
      const refCode = clean(input.refCode) || cookieStore.get("vaap_ref")?.value || ""
      if (refCode) {
        const appId =
          input.applicationId ??
          (
            await db
              .select({ id: membershipApplications.id })
              .from(membershipApplications)
              .where(eq(membershipApplications.email, email))
              .orderBy(desc(membershipApplications.createdAt))
              .limit(1)
          )[0]?.id
        if (appId) {
          await createAttributionForApplication({ applicationId: appId, email, code: refCode })
        }
      }
    } catch (err) {
      console.log("[v0] attribution error:", err instanceof Error ? err.message : err)
    }

    revalidatePath("/admin/applications")

    return { ok: true as const, reference, account }
  } catch {
    return { ok: false as const, error: "We couldn't submit your application. Please try again." }
  }
}

export async function submitContactMessage(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const subject = String(formData.get("subject") ?? "").trim()
  const message = String(formData.get("message") ?? "").trim()

  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in all required fields." }
  }

  await db.insert(contactMessages).values({ name, email, subject, message })

  return { ok: true }
}

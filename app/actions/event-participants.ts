"use server"

import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { eventRsvps, events } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { sendTemplateEmail } from "@/lib/email-templates/service"
import {
  eventEmailVars,
  isValidEmail,
  normalizeEmail,
  sendConfirmedEmail,
  sendVerification,
  type RsvpStatus,
} from "@/lib/event-registration"

const STATUSES: RsvpStatus[] = ["pending", "confirmed", "cancelled"]
const MAX_BULK_RECIPIENTS = 2000

async function requireStaff() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  const role = session.user.role
  if (role !== "staff" && role !== "admin") throw new Error("Forbidden")
  return session.user
}

function refresh(eventId: number) {
  revalidatePath(`/admin/events/${eventId}/participants`)
  revalidatePath("/admin/participants")
  revalidatePath("/admin/events")
}

async function loadEvent(eventId: number) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  return event ?? null
}

export async function getEventParticipants(eventId: number) {
  await requireStaff()
  const event = await loadEvent(eventId)
  if (!event) return null
  const participants = await db
    .select()
    .from(eventRsvps)
    .where(eq(eventRsvps.eventId, eventId))
    .orderBy(asc(eventRsvps.createdAt))
  return { event, participants }
}

const countBy = (status: RsvpStatus) =>
  sql<number>`count(${eventRsvps.id}) filter (where ${eventRsvps.status} = ${status})::int`

export async function getParticipantsOverview() {
  await requireStaff()
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      startsAt: events.startsAt,
      location: events.location,
      published: events.published,
      status: events.status,
      confirmed: countBy("confirmed"),
      pending: countBy("pending"),
      cancelled: countBy("cancelled"),
      checkedIn: sql<number>`count(${eventRsvps.id}) filter (where ${eventRsvps.status} = 'confirmed' and ${eventRsvps.checkedInAt} is not null)::int`,
    })
    .from(events)
    .leftJoin(eventRsvps, eq(eventRsvps.eventId, events.id))
    .groupBy(events.id)
    .orderBy(desc(events.startsAt))
  return rows
}

export async function searchAllParticipants(query: string, status?: string) {
  await requireStaff()
  const q = query.trim().slice(0, 100)
  const filters = []
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
    filters.push(
      or(ilike(eventRsvps.name, like), ilike(eventRsvps.email, like), ilike(eventRsvps.organization, like), ilike(events.title, like)),
    )
  }
  if (status && STATUSES.includes(status as RsvpStatus)) filters.push(eq(eventRsvps.status, status))
  return db
    .select({
      id: eventRsvps.id,
      name: eventRsvps.name,
      email: eventRsvps.email,
      organization: eventRsvps.organization,
      status: eventRsvps.status,
      verifiedAt: eventRsvps.verifiedAt,
      checkedInAt: eventRsvps.checkedInAt,
      createdAt: eventRsvps.createdAt,
      eventId: events.id,
      eventTitle: events.title,
    })
    .from(eventRsvps)
    .innerJoin(events, eq(events.id, eventRsvps.eventId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(eventRsvps.createdAt))
    .limit(300)
}

export async function setParticipantCheckIn(id: number, eventId: number, checkedIn: boolean) {
  await requireStaff()
  await db
    .update(eventRsvps)
    .set({ checkedInAt: checkedIn ? new Date() : null })
    .where(and(eq(eventRsvps.id, id), eq(eventRsvps.eventId, eventId)))
  refresh(eventId)
}

export async function checkInAllParticipants(eventId: number) {
  await requireStaff()
  await db
    .update(eventRsvps)
    .set({ checkedInAt: new Date() })
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, "confirmed"), isNull(eventRsvps.checkedInAt)))
  refresh(eventId)
}

export async function removeParticipant(id: number, eventId: number) {
  await requireStaff()
  await db.delete(eventRsvps).where(and(eq(eventRsvps.id, id), eq(eventRsvps.eventId, eventId)))
  refresh(eventId)
}

/** Manual status override. Confirming emails the participant; cancelling releases the seat. */
export async function setParticipantStatus(id: number, eventId: number, status: RsvpStatus) {
  await requireStaff()
  if (!STATUSES.includes(status)) return { ok: false as const, error: "Invalid status." }
  const now = new Date()
  const [row] = await db
    .update(eventRsvps)
    .set(
      status === "confirmed"
        ? { status, cancelledAt: null, verifyTokenHash: null, verifyExpiresAt: null }
        : status === "cancelled"
          ? { status, cancelledAt: now, checkedInAt: null, verifyTokenHash: null, verifyExpiresAt: null }
          : { status, cancelledAt: null, checkedInAt: null },
    )
    .where(and(eq(eventRsvps.id, id), eq(eventRsvps.eventId, eventId)))
    .returning()
  if (!row) return { ok: false as const, error: "Participant not found." }
  if (status === "confirmed") {
    const event = await loadEvent(eventId)
    if (event) await sendConfirmedEmail(row, event)
  }
  refresh(eventId)
  return { ok: true as const }
}

export async function resendParticipantVerification(id: number, eventId: number) {
  await requireStaff()
  const [rsvp] = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.id, id), eq(eventRsvps.eventId, eventId)))
    .limit(1)
  if (!rsvp) return { ok: false as const, error: "Participant not found." }
  if (rsvp.status !== "pending") return { ok: false as const, error: "Only pending registrations need verification." }
  const event = await loadEvent(eventId)
  if (!event) return { ok: false as const, error: "Event not found." }
  const res = await sendVerification(rsvp, event)
  refresh(eventId)
  if (res.ok) return { ok: true as const }
  if (res.reason === "cooldown") return { ok: false as const, error: `Wait ${res.retryAfterSec}s before resending.` }
  if (res.reason === "limit") return { ok: false as const, error: "Resend limit reached for this address. Try later or confirm manually." }
  return { ok: false as const, error: "The email couldn't be sent. Check the email settings." }
}

/** Staff-added participants are trusted, so they're confirmed straight away. */
export async function addParticipant(eventId: number, formData: FormData) {
  await requireStaff()
  const name = String(formData.get("name") ?? "").trim().slice(0, 120)
  const email = normalizeEmail(formData.get("email"))
  const organization = String(formData.get("organization") ?? "").trim().slice(0, 160)
  const notify = formData.get("notify") === "on"
  if (!name) return { ok: false as const, error: "Name is required." }
  if (!isValidEmail(email)) return { ok: false as const, error: "Enter a valid email." }
  const event = await loadEvent(eventId)
  if (!event) return { ok: false as const, error: "Event not found." }

  const [inserted] = await db
    .insert(eventRsvps)
    .values({ eventId, name, email, organization, status: "confirmed" })
    .onConflictDoNothing()
    .returning()
  if (!inserted) return { ok: false as const, error: "This email is already registered for this event." }

  if (notify) await sendConfirmedEmail(inserted, event)
  refresh(eventId)
  return { ok: true as const }
}

export type BulkAudience = "confirmed" | "pending" | "all" | "selected"

export async function emailParticipants(eventId: number, formData: FormData) {
  await requireStaff()
  const audience = String(formData.get("audience") ?? "confirmed") as BulkAudience
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200)
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000)
  if (!subject) return { ok: false as const, error: "Subject is required." }
  if (!message) return { ok: false as const, error: "Message is required." }

  const event = await loadEvent(eventId)
  if (!event) return { ok: false as const, error: "Event not found." }

  const filters = [eq(eventRsvps.eventId, eventId)]
  if (audience === "selected") {
    const ids = String(formData.get("ids") ?? "")
      .split(",")
      .map((v) => Number.parseInt(v, 10))
      .filter(Number.isFinite)
    if (ids.length === 0) return { ok: false as const, error: "Select at least one participant." }
    filters.push(inArray(eventRsvps.id, ids))
  } else if (audience === "all") {
    filters.push(inArray(eventRsvps.status, ["confirmed", "pending"]))
  } else if (audience === "confirmed" || audience === "pending") {
    filters.push(eq(eventRsvps.status, audience))
  } else {
    return { ok: false as const, error: "Choose who to email." }
  }

  const recipients = await db
    .select({ name: eventRsvps.name, email: eventRsvps.email })
    .from(eventRsvps)
    .where(and(...filters))
    .limit(MAX_BULK_RECIPIENTS)
  if (recipients.length === 0) return { ok: false as const, error: "No participants match that audience." }

  let sent = 0
  let failed = 0
  for (const r of recipients) {
    try {
      const ok = await sendTemplateEmail({
        to: r.email,
        key: "event.participant-update",
        vars: { ...eventEmailVars(event, r.name), subject, message },
      })
      if (ok) sent++
      else failed++
    } catch {
      failed++
    }
  }
  return { ok: true as const, sent, failed }
}

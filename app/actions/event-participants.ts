"use server"

import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { eventRsvps, events } from "@/lib/db/schema"
import { getSession } from "@/lib/session"

async function requireStaff() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  const role = session.user.role
  if (role !== "staff" && role !== "admin") throw new Error("Forbidden")
  return session.user
}

function refresh(eventId: number) {
  revalidatePath(`/admin/events/${eventId}/participants`)
  revalidatePath("/admin/events")
}

export async function getEventParticipants(eventId: number) {
  await requireStaff()
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!event) return null
  const participants = await db
    .select()
    .from(eventRsvps)
    .where(eq(eventRsvps.eventId, eventId))
    .orderBy(asc(eventRsvps.createdAt))
  return { event, participants }
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
    .where(and(eq(eventRsvps.eventId, eventId), isNull(eventRsvps.checkedInAt)))
  refresh(eventId)
}

export async function removeParticipant(id: number, eventId: number) {
  await requireStaff()
  await db.delete(eventRsvps).where(and(eq(eventRsvps.id, id), eq(eventRsvps.eventId, eventId)))
  refresh(eventId)
}

export async function addParticipant(eventId: number, formData: FormData) {
  await requireStaff()
  const name = String(formData.get("name") ?? "").trim().slice(0, 120)
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200)
  if (!name) return { ok: false as const, error: "Name is required." }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, error: "Enter a valid email." }

  const [existing] = await db
    .select({ id: eventRsvps.id })
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), sql`lower(${eventRsvps.email}) = ${email}`))
    .limit(1)
  if (existing) return { ok: false as const, error: "This email is already registered." }

  await db.insert(eventRsvps).values({ eventId, name, email })
  refresh(eventId)
  return { ok: true as const }
}

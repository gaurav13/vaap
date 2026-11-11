import { db } from "@/lib/db"
import { events, eventRsvps } from "@/lib/db/schema"
import { count, desc } from "drizzle-orm"
import { EventsManager } from "@/components/admin/events-manager"
import { getSession } from "@/lib/session"

export default async function AdminEventsPage() {
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      location: events.location,
      timeLabel: events.timeLabel,
      startsAt: events.startsAt,
      published: events.published,
      status: events.status,
      hostName: events.hostName,
      coverImage: events.coverImage,
      submittedByName: events.submittedByName,
      category: events.category,
      city: events.city,
      format: events.format,
      slug: events.slug,
    })
    .from(events)
    .orderBy(desc(events.startsAt))

  const counts = await db
    .select({ eventId: eventRsvps.eventId, n: count() })
    .from(eventRsvps)
    .groupBy(eventRsvps.eventId)
  const countByEvent = new Map(counts.map((c) => [c.eventId, Number(c.n)]))

  const pendingCount = rows.filter((r) => (r.status ?? "approved") === "pending").length

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Events</h1>
      <p className="mt-1 text-muted-2">
        Schedule and manage events.
        {pendingCount > 0 && (
          <span className="ml-1 font-semibold text-amber-700">{pendingCount} awaiting review.</span>
        )}
      </p>
      <EventsManager
        canDelete={(await getSession())?.user?.role === "admin"}
        items={rows.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          location: r.location,
          timeLabel: r.timeLabel,
          startsAt: r.startsAt.toISOString(),
          published: r.published,
          status: r.status ?? "approved",
          hostName: r.hostName ?? "",
          coverImage: r.coverImage ?? "",
          submittedByName: r.submittedByName ?? "",
          category: r.category ?? "",
          city: r.city ?? "",
          format: r.format ?? "",
          slug: r.slug,
          rsvpCount: countByEvent.get(r.id) ?? 0,
        }))}
      />
    </div>
  )
}

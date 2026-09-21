import { db } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { EventsManager } from "@/components/admin/events-manager"

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
    })
    .from(events)
    .orderBy(desc(events.startsAt))

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
        }))}
      />
    </div>
  )
}

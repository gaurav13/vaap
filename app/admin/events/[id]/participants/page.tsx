import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays, ExternalLink, MapPin } from "lucide-react"
import { getEventParticipants } from "@/app/actions/event-participants"
import { ParticipantsManager } from "@/components/admin/participants-manager"
import { AutoRefresh } from "@/components/admin/auto-refresh"

export default async function EventParticipantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const eventId = Number(id)
  if (!Number.isInteger(eventId) || eventId <= 0) notFound()

  const data = await getEventParticipants(eventId)
  if (!data) notFound()
  const { event, participants } = data

  const confirmed = participants.filter((p) => p.status === "confirmed")
  const pending = participants.filter((p) => p.status === "pending").length
  const cancelled = participants.filter((p) => p.status === "cancelled").length
  const checkedIn = confirmed.filter((p) => p.checkedInAt).length
  const dateLabel = event.startsAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/participants" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-2 hover:text-green">
          <ArrowLeft className="size-4" />
          All participants
        </Link>
        <AutoRefresh />
      </div>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-green">Participants</p>
          <h1 className="text-balance font-serif text-2xl font-bold text-heading">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-2">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {dateLabel}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {event.location}
              </span>
            )}
          </div>
        </div>
        <a
          href={`/events/${event.slug || event.id}`}
          target="_blank"
          rel="noreferrer"
          className="flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-navy hover:bg-mint"
        >
          <ExternalLink className="size-4" />
          View event
        </a>
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Confirmed", value: confirmed.length },
          { label: "Pending verification", value: pending },
          { label: "Checked in", value: `${checkedIn} / ${confirmed.length}` },
          { label: "Cancelled", value: cancelled },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">{s.label}</dt>
            <dd className="text-2xl font-bold tabular-nums text-heading">{s.value}</dd>
          </div>
        ))}
      </dl>

      <ParticipantsManager
        eventId={event.id}
        participants={participants.map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          organization: p.organization,
          status: p.status as "pending" | "confirmed" | "cancelled",
          isMember: Boolean(p.userId),
          registeredAt: p.createdAt.toISOString(),
          verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
          verifySentAt: p.verifyLastSentAt ? p.verifyLastSentAt.toISOString() : null,
          checkedInAt: p.checkedInAt ? p.checkedInAt.toISOString() : null,
        }))}
      />
    </div>
  )
}

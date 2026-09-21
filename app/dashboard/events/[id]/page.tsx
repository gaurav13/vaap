import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CalendarDays, MapPin, Clock } from "lucide-react"
import { getSession } from "@/lib/session"
import { getEventById } from "@/app/actions/public"

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const { id } = await params
  const eventId = Number(id)
  if (!Number.isFinite(eventId)) notFound()

  const event = await getEventById(eventId)
  if (!event) notFound()

  const d = new Date(event.startsAt)

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/dashboard/events"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-2 transition-colors hover:text-green"
      >
        <ArrowLeft className="size-4" />
        Back to events
      </Link>

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex items-center gap-4 border-b border-line bg-mint p-6">
          <span className="flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-green text-white">
            <span className="text-3xl font-extrabold leading-none">{d.getDate()}</span>
            <span className="text-xs font-bold uppercase">{d.toLocaleDateString("en-US", { month: "short" })}</span>
          </span>
          <div>
            <h1 className="text-2xl font-bold text-heading text-balance">{event.title}</h1>
            <p className="mt-1 text-sm font-medium text-green">
              {d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-2">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-green" />
              {d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
            {event.timeLabel && (
              <span className="inline-flex items-center gap-2">
                <Clock className="size-4 text-green" />
                {event.timeLabel}
              </span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4 text-green" />
                {event.location}
              </span>
            )}
          </div>

          {event.description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-heading">{event.description}</p>
          ) : (
            <p className="text-sm text-muted-2">More details about this event will be shared soon.</p>
          )}

          <div className="flex flex-wrap gap-3 border-t border-line pt-6">
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
            >
              Register interest
            </Link>
            <Link
              href="/dashboard/events"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-background px-5 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-muted"
            >
              View all events
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"

type EventItem = {
  id: number
  title: string
  location: string
  timeLabel: string
  startsAt: Date | string
}

function monthDay(d: Date | string) {
  const date = new Date(d)
  return {
    month: date.toLocaleDateString("en-US", { month: "short", timeZone: "Asia/Karachi" }).toUpperCase(),
    day: date.toLocaleDateString("en-US", { day: "2-digit", timeZone: "Asia/Karachi" }),
  }
}

export function UpcomingEvents({ events }: { events: EventItem[] }) {
  return (
    <section aria-labelledby="upcoming-events-heading" className="mx-auto w-full max-w-7xl px-5 pb-12 lg:px-8 lg:pb-16">
      <div className="flex items-end justify-between gap-4">
        <h2 id="upcoming-events-heading" className="text-2xl font-bold text-heading md:text-3xl">
          Upcoming Events
        </h2>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-green transition-colors hover:text-green-hover"
        >
          View All Events <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
          No upcoming events.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {events.map((e) => {
            const { month, day } = monthDay(e.startsAt)
            return (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-line bg-card p-4 shadow-sm transition-colors hover:border-green-border"
              >
                <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-mint text-navy">
                  <span className="text-xl font-extrabold leading-none">{day}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-green">{month}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold leading-snug text-heading">{e.title}</h3>
                  <p className="mt-1 truncate text-xs text-muted-2">{e.location}</p>
                  {e.timeLabel && <p className="text-xs text-muted-2">{e.timeLabel}</p>}
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-2 transition-colors group-hover:text-green" aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

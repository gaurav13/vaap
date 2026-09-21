import { redirect } from "next/navigation"
import Link from "next/link"
import { CalendarDays, MapPin, ChevronRight, Plus } from "lucide-react"
import { getSession } from "@/lib/session"
import { getPublishedEvents } from "@/app/actions/public"
import { getMySubmittedEvents, canPublishEvents } from "@/app/actions/member"
import { PageHeading } from "@/components/member/page-heading"

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-mint text-green",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
}

export default async function EventsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const [events, mySubmissions, allowed] = await Promise.all([
    getPublishedEvents(),
    getMySubmittedEvents(),
    canPublishEvents(),
  ])

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading title="Events" description="Upcoming VAAP workshops, summits, and community sessions." />
        {allowed && (
          <Link
            href="/dashboard/events/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-green px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green/90"
          >
            <Plus className="size-4" /> Publish event
          </Link>
        )}
      </div>

      {mySubmissions.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-2">Your submissions</h2>
          <ul className="flex flex-col gap-2">
            {mySubmissions.map((e) => {
              const d = new Date(e.startsAt)
              const status = e.status ?? "pending"
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-heading">{e.title}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}>
                        {status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-2">
                      {d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </div>
                  {status === "approved" && (
                    <Link href={`/events/${e.id}`} className="shrink-0 text-xs font-semibold text-green hover:opacity-80">
                      View
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-card p-12 text-center">
          <CalendarDays className="size-8 text-muted-2" />
          <p className="text-sm font-semibold text-heading">No upcoming events</p>
          <p className="text-sm text-muted-2">Check back soon for new sessions and summits.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => {
            const d = new Date(e.startsAt)
            return (
              <li key={e.id}>
                <Link
                  href={`/dashboard/events/${e.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-line bg-card p-5 transition-colors hover:border-green-border hover:bg-mint/40"
                >
                  <span className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-mint text-green">
                    <span className="text-xl font-extrabold leading-none">{d.getDate()}</span>
                    <span className="text-xs font-bold uppercase">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-heading">{e.title}</h2>
                    {e.description && <p className="mt-1 line-clamp-2 text-sm text-muted-2">{e.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-2">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        {e.timeLabel ? ` · ${e.timeLabel}` : ""}
                      </span>
                      {e.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {e.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-2 transition-colors group-hover:text-green" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

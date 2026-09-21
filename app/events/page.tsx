import Link from "next/link"
import { CalendarDays, Clock, MapPin, ArrowRight } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PageHero } from "@/components/page-hero"
import { getPublishedEvents } from "@/app/actions/public"
import { getHeaderUser } from "@/lib/header-user"

export const metadata = {
  title: "Media & Events | VAAP",
  description: "Upcoming events, webinars, and programs from the Virtual Assets Association of Pakistan.",
}

export default async function EventsPage() {
  const [events, user] = await Promise.all([getPublishedEvents(), getHeaderUser()])

  return (
    <>
        <SiteHeaderServer active="Media & Events" user={user} />
      <main>
        <PageHero
          eyebrow="Media & Events"
          title="Upcoming events & programs"
          description="Join VAAP at conferences, roundtables, and webinars connecting Pakistan's virtual asset ecosystem with the world."
        />

        <section className="mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-20">
          {events.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-card p-10 text-center text-muted-2">
              No upcoming events are scheduled right now. Please check back soon.
            </p>
          ) : (
            <ul className="grid gap-4">
              {events.map((e) => {
                const d = new Date(e.startsAt)
                return (
                  <li key={e.id} id={`event-${e.id}`} className="scroll-mt-28">
                    <Link
                      href={`/events/${e.id}`}
                      className="group flex flex-col gap-4 rounded-xl border border-line bg-card p-5 transition hover:border-green/40 hover:shadow-sm sm:flex-row sm:items-center"
                    >
                      <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-mint text-green">
                        <span className="text-[11px] font-bold uppercase">
                          {d.toLocaleString("en-US", { month: "short" })}
                        </span>
                        <span className="text-2xl font-extrabold leading-none">{d.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-heading">{e.title}</h3>
                        {e.description && <p className="mt-1 line-clamp-2 text-sm text-body">{e.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-2">
                          {e.timeLabel && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="size-3.5" /> {e.timeLabel}
                            </span>
                          )}
                          {e.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="size-3.5" /> {e.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" />
                            {d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                      <span className="hidden items-center gap-1 self-center text-sm font-semibold text-green transition group-hover:translate-x-0.5 sm:flex">
                        View <ArrowRight className="size-4" />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

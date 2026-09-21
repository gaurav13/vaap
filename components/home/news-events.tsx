import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"

type NewsItem = {
  id: number
  title: string
  category: string
  excerpt: string
  image: string | null
  createdAt: Date | string
}

type EventItem = {
  id: number
  title: string
  location: string
  timeLabel: string
  startsAt: Date | string
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function monthDay(d: Date | string) {
  const date = new Date(d)
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: date.toLocaleDateString("en-US", { day: "2-digit" }),
  }
}

export function NewsEvents({ news, events }: { news: NewsItem[]; events: EventItem[] }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
        {/* Latest News */}
        <div>
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold text-heading">Latest News</h2>
            <Link
              href="/news"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green transition-colors hover:text-green-hover"
            >
              View All News <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {news.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
              No news published yet.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {news.map((n) => (
                <article key={n.id} className="group flex flex-col">
                  <div className="relative h-28 overflow-hidden rounded-lg">
                    <img
                      src={n.image || "/images/news-skyline.png"}
                      alt=""
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-3 text-[11px] text-muted-2">{formatDate(n.createdAt)}</p>
                  <h3 className="mt-1.5 text-xs font-bold leading-snug text-heading">{n.title}</h3>
                  <span className="mt-2.5 inline-flex w-fit rounded-md bg-mint px-2.5 py-1 text-[10px] font-semibold text-navy">
                    {n.category}
                  </span>
                  <Link href={`/news/${n.id}`} className="absolute inset-0" aria-label={n.title} />
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="lg:border-l lg:border-line lg:pl-10">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold text-heading">Upcoming Events</h2>
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green transition-colors hover:text-green-hover"
            >
              View All Events <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {events.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
              No upcoming events.
            </p>
          ) : (
            <div className="mt-6 flex flex-col divide-y divide-line">
              {events.map((e) => {
                const { month, day } = monthDay(e.startsAt)
                return (
                  <Link key={e.id} href="/events" className="group flex items-center gap-4 py-4 first:pt-0">
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-mint text-navy">
                      <span className="text-lg font-extrabold leading-none">{day}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-green">{month}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-heading">{e.title}</h3>
                      <p className="mt-1 truncate text-[11px] text-muted-2">{e.location}</p>
                      <p className="text-[11px] text-muted-2">{e.timeLabel}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-2 transition-colors group-hover:text-green" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

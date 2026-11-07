"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { ArrowRight, CalendarDays, Clock, MapPin } from "lucide-react"

export type SliderEvent = {
  id: number
  href: string
  title: string
  category: string
  location: string
  timeLabel: string
  dateLabel: string
  coverImage: string | null
}

export function EventsSlider({ events }: { events: SliderEvent[] }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    const first = track.firstElementChild as HTMLElement | null
    if (!first) return
    const step = first.offsetWidth + 12
    setActive(Math.min(events.length - 1, Math.max(0, Math.round(track.scrollLeft / step))))
  }

  function goTo(index: number) {
    const card = trackRef.current?.children[index] as HTMLElement | undefined
    card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
  }

  return (
    <div className="flex flex-col gap-3">
      <ul
        ref={trackRef}
        onScroll={handleScroll}
        aria-label="Upcoming events"
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {events.map((e, i) => (
          <li
            key={e.id}
            className={`flex shrink-0 snap-start ${events.length > 1 ? "w-[86%]" : "w-full"}`}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${events.length}`}
          >
            <Link
              href={e.href}
              className="group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-navy-dark">
                {e.coverImage ? (
                  <>
                    <img
                      src={e.coverImage || "/placeholder.svg"}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="absolute inset-0 size-full scale-110 object-cover opacity-50 blur-xl"
                    />
                    <img
                      src={e.coverImage || "/placeholder.svg"}
                      alt={`${e.title} banner`}
                      loading="lazy"
                      className="relative size-full object-contain"
                    />
                  </>
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <CalendarDays className="size-8 text-white/40" aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2.5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-bold uppercase tracking-wider text-green">
                    {e.category || "Event"}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-2">
                    <CalendarDays className="size-3.5 text-green" aria-hidden="true" />
                    {e.dateLabel}
                  </span>
                </div>

                <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-heading text-pretty">{e.title}</h3>

                <div className="flex flex-col gap-1 text-xs text-muted-2">
                  {e.location && (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0 text-green" aria-hidden="true" />
                      <span className="truncate">{e.location}</span>
                    </span>
                  )}
                  {e.timeLabel && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5 shrink-0 text-green" aria-hidden="true" />
                      {e.timeLabel}
                    </span>
                  )}
                </div>

                <span className="mt-auto inline-flex items-center gap-1.5 border-t border-line pt-3 text-sm font-semibold text-navy">
                  Event details
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        {events.length > 1 ? (
          <div className="flex items-center gap-1.5">
            {events.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show event ${i + 1}`}
                aria-current={active === i}
                className={`h-1.5 rounded-full transition-all ${active === i ? "w-5 bg-green" : "w-1.5 bg-line"}`}
              />
            ))}
          </div>
        ) : (
          <span />
        )}
        <Link href="/events" className="inline-flex items-center gap-1 text-sm font-semibold text-navy">
          View all events <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

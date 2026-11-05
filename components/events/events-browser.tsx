"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarDays, MapPin, Radio, Search, Users } from "lucide-react"
import { EVENT_CATEGORIES, EVENT_CITIES, eventCover } from "@/lib/event-options"

export type PublicEvent = {
  id: number
  title: string
  description: string
  location: string
  startsAt: string
  category: string
  city: string
  format: string
  coverImage: string | null
}

type Tab = "upcoming" | "past" | "all"

const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming Events" },
  { id: "past", label: "Past Events" },
  { id: "all", label: "All Events" },
]

const selectCls =
  "h-11 w-full appearance-none rounded-lg border border-line bg-card pl-10 pr-8 text-sm text-body outline-none transition focus:border-green focus:ring-2 focus:ring-green/20"

export function EventsBrowser({ events, now }: { events: PublicEvent[]; now: string }) {
  const [tab, setTab] = useState<Tab>("upcoming")
  const [category, setCategory] = useState("")
  const [city, setCity] = useState("")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const cutoff = new Date(now).getTime()
    const q = query.trim().toLowerCase()
    const list = events.filter((e) => {
      const t = new Date(e.startsAt).getTime()
      if (tab === "upcoming" && t < cutoff) return false
      if (tab === "past" && t >= cutoff) return false
      if (category && e.category !== category) return false
      if (city && e.city !== city) return false
      if (q && !`${e.title} ${e.description} ${e.location} ${e.city}`.toLowerCase().includes(q)) return false
      return true
    })
    return tab === "past" ? list.reverse() : list
  }, [events, tab, category, city, query, now])

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
      <div className="flex flex-col gap-5 border-b border-line lg:flex-row lg:items-end lg:justify-between">
        <div role="tablist" aria-label="Event timeframe" className="-mb-px flex gap-6 overflow-x-auto sm:gap-10">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 pb-3 text-base font-semibold transition sm:text-lg ${
                tab === t.id ? "border-green text-green" : "border-transparent text-heading hover:text-green"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 pb-4 sm:grid-cols-3 lg:w-[40rem]">
          <label className="relative">
            <span className="sr-only">Filter by category</span>
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-green" aria-hidden="true" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
              <option value="">All Categories</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">Filter by city</span>
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-green" aria-hidden="true" />
            <select value={city} onChange={(e) => setCity(e.target.value)} className={selectCls}>
              <option value="">All Cities</option>
              {EVENT_CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">Search events</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events..."
              className={selectCls}
            />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-line bg-card p-12 text-center text-muted-2">
          {tab === "past" ? "No past events match your filters." : "No events match your filters right now. Please check back soon."}
        </p>
      ) : (
        <ul className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <li key={e.id}>
              <EventCard event={e} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function EventCard({ event: e }: { event: PublicEvent }) {
  const d = new Date(e.startsAt)
  const FormatIcon = e.format === "By Invitation" ? Users : Radio
  const place = e.city || e.location

  return (
    <article className="flex h-full gap-4 rounded-2xl border border-line bg-card p-3 shadow-sm transition hover:shadow-md">
      <div className="relative w-32 shrink-0 overflow-hidden rounded-xl sm:w-40">
        <Image
          src={eventCover(e.coverImage, e.category) || "/placeholder.svg"}
          alt=""
          fill
          sizes="160px"
          className="object-cover"
        />
        <div className="absolute left-3 top-3 flex flex-col items-center rounded-lg bg-card px-2.5 py-1.5 text-center text-heading shadow">
          <span className="text-2xl font-extrabold leading-none">{d.getDate()}</span>
          <span className="text-sm font-semibold leading-tight">{d.toLocaleString("en-US", { month: "short" })}</span>
          <span className="text-xs font-semibold">{d.getFullYear()}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 py-2 pr-2">
        {e.category && (
          <span className="self-start rounded-full bg-mint px-3 py-1 text-xs font-bold text-green">{e.category}</span>
        )}
        <h3 className="text-pretty text-lg font-bold leading-snug text-heading">{e.title}</h3>
        {(place || e.format) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-body">
            {place && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 text-green" aria-hidden="true" /> {place}
              </span>
            )}
            {place && e.format && <span className="h-4 w-px bg-line" aria-hidden="true" />}
            {e.format && (
              <span className="flex items-center gap-1.5">
                <FormatIcon className="size-4 text-green" aria-hidden="true" /> {e.format}
              </span>
            )}
          </div>
        )}
        {e.description && <p className="line-clamp-3 text-sm leading-relaxed text-body">{e.description}</p>}
        <Link
          href={`/events/${e.id}`}
          className="mt-auto inline-flex items-center gap-2 self-start rounded-full border border-green px-5 py-2 text-sm font-bold text-green transition hover:bg-green hover:text-primary-foreground"
        >
          View Details <ArrowRight className="size-4" aria-hidden="true" />
          <span className="sr-only">for {e.title}</span>
        </Link>
      </div>
    </article>
  )
}

import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock,
  Headphones,
  Megaphone,
  MapPin,
  Mic,
  Play,
  PlayCircle,
  Tv,
} from "lucide-react"
import type { SocialLinks } from "@/lib/site-settings"
import { FollowVaap } from "@/components/follow-vaap"

type EventItem = {
  id: number
  slug?: string | null
  title: string
  description: string
  location: string
  timeLabel: string
  coverImage: string | null
  category: string
  startsAt: Date | string
}

type MediaItem = {
  id: number
  title: string
  description: string
  kind: string
  image: string | null
  url: string | null
  duration: string
}

const KIND_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "TV Interview": Tv,
  "Press Conference": Mic,
  "Social Update": BadgeCheck,
  Podcast: Headphones,
  Video: PlayCircle,
}

const TZ = "Asia/Karachi"

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ })
}

function dateParts(d: Date | string) {
  const date = new Date(d)
  return {
    day: date.toLocaleDateString("en-US", { day: "2-digit", timeZone: TZ }),
    month: date.toLocaleDateString("en-US", { month: "short", timeZone: TZ }),
    year: date.toLocaleDateString("en-US", { year: "numeric", timeZone: TZ }),
  }
}

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function linkLabel(url: string | null) {
  if (!url) return "View highlight"
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    if (host.includes("youtube.com") || host === "youtu.be") return "Watch on YouTube"
    if (host.includes("linkedin.com")) return "View on LinkedIn"
    if (host === "x.com" || host.includes("twitter.com")) return "View on X"
    if (host.includes("facebook.com")) return "View on Facebook"
    if (host.includes("instagram.com")) return "View on Instagram"
    if (host.includes("tiktok.com")) return "Watch on TikTok"
    return `Open on ${host}`
  } catch {
    return "View highlight"
  }
}

function isVideo(item: MediaItem) {
  return Boolean(item.duration) || item.kind === "TV Interview" || item.kind === "Video"
}


function Media({
  src,
  alt,
  contain = false,
  className = "",
  children,
  fallback: Fallback = CalendarDays,
}: {
  src: string | null
  alt: string
  contain?: boolean
  className?: string
  children?: ReactNode
  fallback?: ComponentType<{ className?: string }>
}) {
  return (
    <div className={`relative overflow-hidden bg-navy-dark ${className}`}>
      {src && contain ? (
        <>
          <img src={src || "/placeholder.svg"} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-xl" />
          <img src={src || "/placeholder.svg"} alt={alt} loading="lazy" className="relative size-full object-contain" />
        </>
      ) : src ? (
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Fallback className="size-10 text-white/40" />
        </div>
      )}
      {children}
    </div>
  )
}

function PlayBadge({ small = false }: { small?: boolean }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <span
        className={`flex items-center justify-center rounded-full bg-card/95 text-navy shadow-lg ring-4 ring-card/30 transition-transform duration-300 group-hover:scale-110 ${small ? "size-9" : "size-14"}`}
      >
        <Play className={`ml-0.5 fill-current ${small ? "size-4" : "size-6"}`} />
      </span>
    </span>
  )
}

function DateBlock({ date }: { date: Date | string }) {
  const { day, month, year } = dateParts(date)
  return (
    <div className="flex w-16 shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-card text-center shadow-md">
      <span className="bg-green py-0.5 text-[11px] font-bold uppercase tracking-widest text-white">{month}</span>
      <span className="pt-1 text-2xl font-bold leading-none text-heading">{day}</span>
      <span className="pb-1.5 text-[11px] font-medium text-muted-2">{year}</span>
    </div>
  )
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-green">
      {children}
    </span>
  )
}


function EventsColumn({ events }: { events: EventItem[] }) {
  const [featured, ...rest] = events
  const more = rest.slice(0, 2)

  return (
    <div className="flex flex-col gap-4">
      <h2 id="events-programs-heading" className="sr-only">
        Events &amp; Programs
      </h2>

      {!featured ? (
        <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
          No upcoming events. Check back soon.
        </p>
      ) : (
        <>
          <Link
            href={`/events/${featured.slug || featured.id}`}
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
          >
            <div className="relative overflow-hidden bg-mint">
              {featured.coverImage ? (
                <img
                  src={featured.coverImage || "/placeholder.svg"}
                  alt={`${featured.title} banner`}
                  loading="lazy"
                  className="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex aspect-[2/1] items-center justify-center bg-navy-dark">
                  <CalendarDays className="size-10 text-white/40" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex px-5 pt-4 sm:px-6">
              <Pill>
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {featured.category || "Event"}
              </Pill>
            </div>
            <div className="flex flex-col gap-4 bg-card px-5 pb-5 pt-3 sm:flex-row sm:items-center sm:gap-5 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <DateBlock date={featured.startsAt} />
                <span className="hidden h-12 w-px bg-line sm:block" aria-hidden="true" />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="sr-only">{featured.title}</h3>
                  {featured.location && (
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-heading">
                      <MapPin className="size-4 shrink-0 text-green" aria-hidden="true" />
                      <span className="truncate">{featured.location}</span>
                    </span>
                  )}
                  {featured.timeLabel && (
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-heading">
                      <Clock className="size-4 shrink-0 text-green" aria-hidden="true" />
                      {featured.timeLabel}
                    </span>
                  )}
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-navy-dark px-5 py-3 text-sm font-bold text-white shadow-md transition-colors group-hover:bg-green">
                Event Details
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </div>
          </Link>

          {more.map((e) => (
            <Link
              key={e.id}
              href={`/events/${e.slug || e.id}`}
              className="group flex flex-col gap-4 rounded-3xl border border-line bg-card p-3 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green sm:flex-row sm:items-center"
            >
              <Media src={e.coverImage} alt="" className="aspect-video w-full shrink-0 rounded-xl sm:w-2/5" />
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:py-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Pill>
                    <Megaphone className="size-3.5" aria-hidden="true" />
                    {e.category || "Announcement"}
                  </Pill>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-2">
                    <CalendarDays className="size-3.5 text-green" aria-hidden="true" />
                    {formatDate(e.startsAt)}
                  </span>
                </div>
                <h3 className="line-clamp-3 text-base font-bold leading-snug text-heading text-pretty group-hover:text-green">{e.title}</h3>
                {e.description && <p className="line-clamp-2 text-sm leading-relaxed text-muted-2">{stripHtml(e.description)}</p>}
              </div>
              <span className="hidden size-9 shrink-0 items-center justify-center rounded-full border border-line text-navy transition-colors group-hover:border-green group-hover:bg-green group-hover:text-white sm:flex">
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </Link>
          ))}

          <Link href="/events" className="inline-flex items-center gap-1.5 self-end text-sm font-semibold text-navy transition-colors hover:text-green">
            View All Events <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </>
      )}
    </div>
  )
}

function MaybeLink({ url, className, children, label }: { url: string | null; className: string; children: ReactNode; label: string }) {
  if (!url) return <div className={className}>{children}</div>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only">{`${label} (opens in a new tab)`}</span>
    </a>
  )
}

function KindLabel({ kind }: { kind: string }) {
  const Icon = KIND_ICONS[kind] ?? PlayCircle
  return (
    <Pill>
      <Icon className="size-3.5" aria-hidden="true" />
      {kind}
    </Pill>
  )
}

function MediaColumn({ items, social }: { items: MediaItem[]; social: SocialLinks }) {
  const list = items.slice(0, 3)

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-lg">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full ring-2 ring-navy">
            <Play className="ml-0.5 size-4 fill-navy text-navy" aria-hidden="true" />
          </span>
          <h2 id="media-highlights-heading" className="text-lg font-bold text-heading md:text-xl text-balance">
            Media &amp; Social Highlights
          </h2>
          <Link
            href="/news"
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-green transition-colors hover:text-navy"
          >
            View All Media <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {list.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-2">Media highlights are coming soon.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line px-4">
            {list.map((m) => (
              <li key={m.id} className="py-4">
                <MaybeLink url={m.url} label={m.title} className="group flex items-start gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green">
                  <Media src={m.image} alt="" fallback={PlayCircle} className="aspect-video w-2/5 shrink-0 rounded-xl shadow-sm">
                    {isVideo(m) && m.image && <PlayBadge small />}
                    {m.duration && (
                      <span className="absolute bottom-2 right-2 rounded bg-navy-dark/85 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        {m.duration}
                      </span>
                    )}
                  </Media>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <span>
                      <KindLabel kind={m.kind} />
                    </span>
                    <h3 className="line-clamp-3 text-sm font-bold leading-snug text-heading text-pretty group-hover:text-green sm:text-base">
                      {m.title}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green">
                      {linkLabel(m.url)}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </div>
                </MaybeLink>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FollowVaap social={social} />
    </div>
  )
}

export function EventsMedia({
  events,
  media,
  social,
}: {
  events: EventItem[]
  media: MediaItem[]
  social: SocialLinks
}) {
  return (
    <section aria-labelledby="events-programs-heading" className="mx-auto w-full max-w-7xl px-5 pb-12 lg:px-8 lg:pb-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
        <EventsColumn events={events} />
        <MediaColumn items={media} social={social} />
      </div>
    </section>
  )
}

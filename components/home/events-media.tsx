import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Clock,
  Headphones,
  MapPin,
  Mic,
  Play,
  PlayCircle,
  Tv,
} from "lucide-react"
import type { SocialLinks } from "@/lib/site-settings"
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon, XIcon, YoutubeIcon } from "@/components/social-icons"

type EventItem = {
  id: number
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

function ColumnHeader({
  id,
  icon: Icon,
  title,
  href,
  linkLabel,
}: {
  id: string
  icon: ComponentType<{ className?: string }>
  title: string
  href: string
  linkLabel: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy text-white shadow-sm">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 id={id} className="text-xl font-bold text-heading md:text-2xl text-balance">
        {title}
      </h2>
      <span className="hidden h-px min-w-6 flex-1 bg-line sm:block" aria-hidden="true" />
      <Link
        href={href}
        className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-navy transition-colors hover:text-green"
      >
        {linkLabel} <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  )
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
    <div className="flex w-16 shrink-0 flex-col overflow-hidden rounded-xl border border-line text-center">
      <span className="bg-navy py-0.5 text-[11px] font-bold uppercase tracking-widest text-white">{month}</span>
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

function CardFooter({ label, external = false }: { label: string; external?: boolean }) {
  const Icon = external ? ArrowUpRight : ArrowRight
  return (
    <div className="mt-auto flex items-center justify-between border-t border-line px-5 py-3">
      <span className="text-sm font-semibold text-navy transition-colors group-hover:text-green">{label}</span>
      <span className="flex size-8 items-center justify-center rounded-full bg-navy text-white transition-colors group-hover:bg-green">
        <Icon className="size-4" aria-hidden="true" />
      </span>
    </div>
  )
}

const featuredCard =
  "group flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"

const smallCard =
  "group flex h-full overflow-hidden rounded-xl border border-line bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"

function SmallGrid({ count, children }: { count: number; children: ReactNode }) {
  return <ul className={`grid gap-4 ${count > 1 ? "sm:grid-cols-2" : ""}`}>{children}</ul>
}

function EventsColumn({ events }: { events: EventItem[] }) {
  const [featured, ...rest] = events
  const more = rest.slice(0, 2)
  const single = more.length === 1

  return (
    <div className="flex flex-col gap-5">
      <ColumnHeader id="events-programs-heading" icon={CalendarDays} title="Events & Programs" href="/events" linkLabel="View All Events" />

      {!featured ? (
        <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
          No upcoming events. Check back soon.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <Link href={`/events/${featured.id}`} className={featuredCard}>
            <Media src={featured.coverImage} alt={`${featured.title} banner`} contain className="aspect-[21/9]" />
            <div className="flex gap-4 p-5">
              <DateBlock date={featured.startsAt} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {featured.category && (
                  <span>
                    <Pill>{featured.category}</Pill>
                  </span>
                )}
                <h3 className="line-clamp-2 text-lg font-bold leading-snug text-heading text-pretty group-hover:text-green">
                  {featured.title}
                </h3>
                {featured.description && (
                  <p className="line-clamp-1 text-sm leading-relaxed text-muted-2">{stripHtml(featured.description)}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-2">
                  {featured.location && (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin className="size-4 shrink-0 text-green" aria-hidden="true" />
                      <span className="truncate">{featured.location}</span>
                    </span>
                  )}
                  {featured.timeLabel && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-4 shrink-0 text-green" aria-hidden="true" />
                      {featured.timeLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <CardFooter label="View event details" />
          </Link>

          {more.length > 0 && (
            <SmallGrid count={more.length}>
              {more.map((e) => (
                <li key={e.id}>
                  <Link href={`/events/${e.id}`} className={`${smallCard} ${single ? "flex-row" : "flex-col"}`}>
                    <Media src={e.coverImage} alt="" className={single ? "w-40 shrink-0 sm:w-52" : "aspect-video"} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {formatDate(e.startsAt)}
                      </span>
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-heading group-hover:text-green">{e.title}</h3>
                      {e.location && (
                        <p className="mt-auto inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-2">
                          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{e.location}</span>
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </SmallGrid>
          )}
        </div>
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
  const [featured, ...rest] = items
  const more = rest.slice(0, 2)
  const single = more.length === 1
  const socials = [
    { Icon: LinkedinIcon, href: social.linkedin, label: "LinkedIn" },
    { Icon: XIcon, href: social.x, label: "X" },
    { Icon: YoutubeIcon, href: social.youtube, label: "YouTube" },
    { Icon: InstagramIcon, href: social.instagram, label: "Instagram" },
    { Icon: FacebookIcon, href: social.facebook, label: "Facebook" },
    { Icon: TiktokIcon, href: social.tiktok, label: "TikTok" },
  ].filter((s) => s.href)

  return (
    <div className="flex flex-col gap-5">
      <ColumnHeader id="media-highlights-heading" icon={PlayCircle} title="Media & Social Highlights" href="/news" linkLabel="View All Media" />

      {!featured ? (
        <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
          Media highlights are coming soon.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <MaybeLink url={featured.url} label={featured.title} className={featuredCard}>
            <Media src={featured.image} alt="" contain fallback={PlayCircle} className="aspect-[21/9]">
              {isVideo(featured) && featured.image && <PlayBadge />}
              {featured.duration && (
                <span className="absolute bottom-3 right-3 rounded-md bg-navy-dark/85 px-2 py-0.5 text-xs font-semibold text-white">
                  {featured.duration}
                </span>
              )}
            </Media>
            <div className="flex flex-col gap-1.5 p-5">
              <span>
                <KindLabel kind={featured.kind} />
              </span>
              <h3 className="line-clamp-2 text-lg font-bold leading-snug text-heading text-pretty group-hover:text-green">
                {featured.title}
              </h3>
              {featured.description && <p className="line-clamp-1 text-sm leading-relaxed text-muted-2">{featured.description}</p>}
            </div>
            <CardFooter label={linkLabel(featured.url)} external={Boolean(featured.url)} />
          </MaybeLink>

          {more.length > 0 && (
            <SmallGrid count={more.length}>
              {more.map((m) => (
                <li key={m.id}>
                  <MaybeLink url={m.url} label={m.title} className={`${smallCard} ${single ? "flex-row" : "flex-col"}`}>
                    <Media src={m.image} alt="" fallback={PlayCircle} className={single ? "w-40 shrink-0 sm:w-52" : "aspect-video"}>
                      {isVideo(m) && m.image && <PlayBadge small />}
                      {m.duration && (
                        <span className="absolute bottom-2 right-2 rounded bg-navy-dark/85 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          {m.duration}
                        </span>
                      )}
                    </Media>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-4">
                      <span>
                        <KindLabel kind={m.kind} />
                      </span>
                      <p className="line-clamp-2 text-sm font-bold leading-snug text-heading group-hover:text-green">{m.title}</p>
                      {single && m.description && <p className="line-clamp-2 text-xs leading-relaxed text-muted-2">{m.description}</p>}
                    </div>
                  </MaybeLink>
                </li>
              ))}
            </SmallGrid>
          )}
        </div>
      )}

      {socials.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy px-5 py-4">
          <div>
            <p className="text-base font-bold text-white">Follow VAAP</p>
            <p className="text-xs text-white/70">Announcements, interviews and event highlights</p>
          </div>
          <ul className="flex flex-wrap items-center gap-2">
            {socials.map(({ Icon, href, label }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`VAAP on ${label} (opens in a new tab)`}
                  className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-colors hover:bg-green hover:ring-green"
                >
                  <Icon className="size-[18px]" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
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

import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
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

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  })
}

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
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

function Banner({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-navy-dark ${className}`}>
      {src ? (
        <img src={src || "/placeholder.svg"} alt={alt} loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <CalendarDays className="size-10 text-white/40" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

function EventsColumn({ events }: { events: EventItem[] }) {
  const [featured, ...rest] = events
  return (
    <div className="flex flex-col gap-5">
      <ColumnHeader id="events-programs-heading" icon={CalendarDays} title="Events & Programs" href="/events" linkLabel="View All Events" />

      {!featured ? (
        <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
          No upcoming events. Check back soon.
        </p>
      ) : (
        <div className="flex flex-col gap-4 rounded-3xl border border-line bg-card p-3 shadow-sm">
          <article className="overflow-hidden rounded-2xl border border-line bg-card">
            <Banner src={featured.coverImage} alt={`${featured.title} banner`} className="aspect-[16/9]" />
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                {featured.category && (
                  <span className="text-xs font-bold uppercase tracking-wider text-green">{featured.category}</span>
                )}
                <h3 className="mt-1 text-lg font-bold leading-snug text-heading text-pretty">{featured.title}</h3>
                {featured.description && (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-2">{stripHtml(featured.description)}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-2">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-green" aria-hidden="true" />
                    {formatDate(featured.startsAt)}
                  </span>
                  {featured.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-green" aria-hidden="true" />
                      {featured.location}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/events/${featured.id}`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-dark"
              >
                Event Details <ArrowRight className="size-4" aria-hidden="true" />
                <span className="sr-only">for {featured.title}</span>
              </Link>
            </div>
          </article>

          {rest.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2">
              {rest.slice(0, 2).map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card transition-colors hover:border-green-border"
                  >
                    <Banner src={e.coverImage} alt="" className="aspect-[16/9]" />
                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <h3 className="flex items-start gap-2 text-sm font-bold leading-snug text-heading">
                        <CalendarDays className="mt-0.5 size-4 shrink-0 text-green" aria-hidden="true" />
                        <span className="group-hover:text-green">{e.title}</span>
                      </h3>
                      {e.description && (
                        <p className="line-clamp-2 text-sm leading-relaxed text-muted-2">{stripHtml(e.description)}</p>
                      )}
                      <p className="mt-auto pt-1 text-xs font-medium text-muted-2">{formatDate(e.startsAt)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
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

function Thumb({ item, className = "" }: { item: MediaItem; className?: string }) {
  const isVideo = Boolean(item.duration) || item.kind === "TV Interview" || item.kind === "Video"
  return (
    <div className={`relative overflow-hidden bg-navy-dark ${className}`}>
      {item.image ? (
        <img src={item.image || "/placeholder.svg"} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <PlayCircle className="size-10 text-white/40" aria-hidden="true" />
        </div>
      )}
      {isVideo && item.image && (
        <span className="absolute inset-0 flex items-center justify-center bg-navy-dark/20">
          <span className="flex size-12 items-center justify-center rounded-full border-2 border-white bg-navy-dark/40 text-white backdrop-blur-sm">
            <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
          </span>
        </span>
      )}
      {item.duration && (
        <span className="absolute bottom-2 right-2 rounded-md bg-navy-dark/85 px-2 py-0.5 text-xs font-semibold text-white">
          {item.duration}
        </span>
      )}
    </div>
  )
}

function KindLabel({ kind }: { kind: string }) {
  const Icon = KIND_ICONS[kind] ?? PlayCircle
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-heading">
      <Icon className="size-4 text-green" aria-hidden="true" />
      {kind}
    </span>
  )
}

function MediaColumn({ items, social }: { items: MediaItem[]; social: SocialLinks }) {
  const [featured, ...rest] = items
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
        <div className="flex flex-col gap-4 rounded-3xl border border-line bg-card p-3 shadow-sm">
          <MaybeLink
            url={featured.url}
            label={featured.title}
            className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card sm:flex-row"
          >
            <Thumb item={featured} className="aspect-video sm:w-3/5 sm:shrink-0" />
            <div className="flex flex-col justify-center gap-2 p-5">
              <KindLabel kind={featured.kind} />
              <h3 className="text-base font-semibold leading-snug text-heading text-pretty group-hover:text-green">{featured.title}</h3>
              {featured.description && <p className="line-clamp-3 text-sm leading-relaxed text-muted-2">{featured.description}</p>}
            </div>
          </MaybeLink>

          {rest.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2">
              {rest.slice(0, 2).map((m) => (
                <li key={m.id}>
                  <MaybeLink
                    url={m.url}
                    label={m.title}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card transition-colors hover:border-green-border"
                  >
                    <Thumb item={m} className="aspect-video" />
                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <KindLabel kind={m.kind} />
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted-2">{m.title}</p>
                    </div>
                  </MaybeLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {socials.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-mint px-5 py-4">
          <p className="text-base font-bold text-heading">Follow VAAP</p>
          <span className="hidden h-8 w-px bg-line sm:block" aria-hidden="true" />
          <ul className="flex flex-wrap items-center gap-3">
            {socials.map(({ Icon, href, label }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`VAAP on ${label} (opens in a new tab)`}
                  className="flex size-10 items-center justify-center rounded-xl bg-navy text-white transition-colors hover:bg-green"
                >
                  <Icon className="size-5" />
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

import { cache } from "react"
import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, CalendarDays, Clock, MapPin, Users, UserCircle2 } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { RsvpForm } from "@/components/events/rsvp-form"
import { getEventById, getEventBySlug, getEventRsvps } from "@/app/actions/public"
import { getHeaderUser } from "@/lib/header-user"
import { eventPath } from "@/lib/event-slug"

// Old links used numeric ids (/events/3); those resolve by id and then redirect to the slug URL.
const resolveEvent = cache(async (param: string) => {
  const decoded = decodeURIComponent(param)
  if (/^\d+$/.test(decoded)) return getEventById(Number.parseInt(decoded, 10))
  return getEventBySlug(decoded)
})

function plainExcerpt(text: string | null | undefined, max = 155) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const event = await resolveEvent(slug)
  if (!event) return { title: "Event | VAAP" }
  const description = plainExcerpt(event.description) || "Join this VAAP event."
  const path = eventPath(event)
  return {
    title: `${event.title} | VAAP Events`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title: event.title,
      description,
      images: event.coverImage ? [{ url: event.coverImage, alt: event.title }] : undefined,
    },
    twitter: {
      card: event.coverImage ? "summary_large_image" : "summary",
      title: event.title,
      description,
      images: event.coverImage ? [event.coverImage] : undefined,
    },
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [event, user] = await Promise.all([resolveEvent(slug), getHeaderUser()])
  if (!event) notFound()
  if (event.slug && decodeURIComponent(slug) !== event.slug) permanentRedirect(eventPath(event))

  const rsvps = await getEventRsvps(event.id)
  const d = new Date(event.startsAt)
  const isOnline = /online|virtual/i.test(`${event.format} ${event.location}`)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: plainExcerpt(event.description, 500),
    startDate: d.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: isOnline
      ? { "@type": "VirtualLocation", url: eventPath(event) }
      : {
          "@type": "Place",
          name: event.location || event.city || "Pakistan",
          address: [event.location, event.city, "Pakistan"].filter(Boolean).join(", "),
        },
    image: event.coverImage ? [event.coverImage] : undefined,
    organizer: { "@type": "Organization", name: event.hostName || "VAAP" },
  }
  const dateLong = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <>
      <SiteHeaderServer active="Media & Events" user={user} />
      <main className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-green transition hover:opacity-80"
        >
          <ArrowLeft className="size-4" /> All events
        </Link>

        {event.coverImage ? (
          <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-line bg-mint">
            <Image
              src={event.coverImage || "/placeholder.svg"}
              alt={event.title}
              fill
              priority
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="mt-6 flex aspect-[16/6] w-full items-center justify-center rounded-2xl border border-line bg-mint">
            <div className="flex size-20 flex-col items-center justify-center rounded-xl bg-green text-white">
              <span className="text-xs font-bold uppercase">{d.toLocaleString("en-US", { month: "short" })}</span>
              <span className="text-3xl font-extrabold leading-none">{d.getDate()}</span>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Main */}
          <div>
            <h1 className="text-balance font-serif text-3xl font-bold text-heading lg:text-4xl">{event.title}</h1>
            {event.hostName && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-2">
                <UserCircle2 className="size-4" /> Hosted by <span className="font-semibold text-body">{event.hostName}</span>
              </p>
            )}

            <div className="mt-6 grid gap-3 rounded-xl border border-line bg-card p-5 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-5 text-green" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">Date</p>
                  <p className="text-sm font-medium text-body">{dateLong}</p>
                </div>
              </div>
              {event.timeLabel && (
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 size-5 text-green" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">Time</p>
                    <p className="text-sm font-medium text-body">{event.timeLabel}</p>
                  </div>
                </div>
              )}
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 text-green" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">Location</p>
                    <p className="text-sm font-medium text-body">{event.location}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 size-5 text-green" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">Going</p>
                  <p className="text-sm font-medium text-body">
                    {rsvps.length} {rsvps.length === 1 ? "person" : "people"}
                  </p>
                </div>
              </div>
            </div>

            {event.description && (
              <div className="mt-8">
                <h2 className="font-serif text-xl font-bold text-heading">About this event</h2>
                <div className="mt-3 whitespace-pre-line text-pretty leading-relaxed text-body">{event.description}</div>
              </div>
            )}

            {/* Participants */}
            <div className="mt-10">
              <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-heading">
                Participants
                <span className="rounded-full bg-mint px-2.5 py-0.5 text-sm font-bold text-green">{rsvps.length}</span>
              </h2>
              {rsvps.length === 0 ? (
                <p className="mt-3 text-sm text-muted-2">Be the first to register for this event.</p>
              ) : (
                <ul className="mt-4 flex flex-wrap gap-3">
                  {rsvps.map((r) => (
                    <li key={r.id} className="flex items-center gap-2.5 rounded-full border border-line bg-card py-1.5 pl-1.5 pr-4">
                      <span className="flex size-8 items-center justify-center rounded-full bg-green text-xs font-bold text-white">
                        {initials(r.name)}
                      </span>
                      <span className="text-sm font-medium text-body">{r.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* RSVP sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-line bg-card p-6">
              <h2 className="font-serif text-lg font-bold text-heading">Register</h2>
              <p className="mt-1 text-sm text-muted-2">Reserve your spot — it only takes a moment.</p>
              <div className="mt-5">
                <RsvpForm eventId={event.id} defaultName={user?.name ?? ""} defaultEmail={user?.email ?? ""} />
              </div>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

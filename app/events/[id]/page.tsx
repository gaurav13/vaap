import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, CalendarDays, Clock, MapPin, Users, UserCircle2 } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { RsvpForm } from "@/components/events/rsvp-form"
import { getEventById, getEventRsvps } from "@/app/actions/public"
import { getHeaderUser } from "@/lib/header-user"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getEventById(Number.parseInt(id, 10))
  if (!event) return { title: "Event | VAAP" }
  return {
    title: `${event.title} | VAAP Events`,
    description: event.description?.slice(0, 155) || "Join this VAAP event.",
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

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const eventId = Number.parseInt(id, 10)
  if (!Number.isFinite(eventId)) notFound()

  const [event, user] = await Promise.all([getEventById(eventId), getHeaderUser()])
  if (!event) notFound()

  const rsvps = await getEventRsvps(eventId)
  const d = new Date(event.startsAt)
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
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-green transition hover:opacity-80"
        >
          <ArrowLeft className="size-4" /> All events
        </Link>

        {event.coverImage ? (
          <div className="relative mt-6 aspect-[16/6] w-full overflow-hidden rounded-2xl border border-line bg-mint">
            <Image src={event.coverImage || "/placeholder.svg"} alt={event.title} fill className="object-cover" />
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

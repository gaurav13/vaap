import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { EventsHero } from "@/components/events/events-hero"
import { EventsBrowser } from "@/components/events/events-browser"
import { getAllPublicEvents } from "@/app/actions/public"
import { getHeaderUser } from "@/lib/header-user"

export const metadata = {
  title: "Events Hub | VAAP",
  description:
    "Discover, join, and submit digital asset, blockchain, and Web3 events across Pakistan with the Virtual Asset Industry Alliance of Pakistan.",
}

export default async function EventsPage() {
  const [rows, user] = await Promise.all([getAllPublicEvents(), getHeaderUser()])

  const events = rows.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: e.description,
    location: e.location,
    startsAt: e.startsAt.toISOString(),
    category: e.category ?? "",
    city: e.city ?? "",
    format: e.format ?? "",
    coverImage: e.coverImage,
  }))

  const submitHref = user ? "/dashboard/events/new" : "/sign-in?next=/dashboard/events/new"

  return (
    <>
      <SiteHeaderServer active="Media & Events" user={user} />
      <main>
        <EventsHero submitHref={submitHref} />
        <EventsBrowser events={events} now={new Date().toISOString()} />
      </main>
      <SiteFooter />
    </>
  )
}

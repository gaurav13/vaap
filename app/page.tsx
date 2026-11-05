import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Hero } from "@/components/home/hero"
import { Legitimacy } from "@/components/home/legitimacy"
import { Framework } from "@/components/home/framework"
import { LatestNewsMedia } from "@/components/home/latest-news-media"
import { EventsMedia } from "@/components/home/events-media"
import { getSession } from "@/lib/session"
import { getMenuItems, getNewsAlert, getSiteSettings } from "@/lib/site-settings"
import { getPublishedNews, getPublishedEvents } from "@/app/actions/public"
import { getMediaHighlights } from "@/app/actions/cms"
import { toHeaderUser } from "@/lib/header-user"

export default async function Home() {
  const [session, nav, news, events, newsAlert, media, settings] = await Promise.all([
    getSession(),
    getMenuItems(),
    getPublishedNews(24),
    getPublishedEvents(3),
    getNewsAlert(),
    getMediaHighlights(3),
    getSiteSettings(),
  ])

  const newsItems = news.map((n) => ({
    id: n.id,
    title: n.title,
    category: n.category,
    excerpt: n.excerpt,
    image: n.image,
    publisherName: n.publisherName,
    publisherLogo: n.publisherLogo,
    externalUrl: n.externalUrl,
    createdAt: n.createdAt.toISOString(),
  }))

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader variant="solid" active="Home" user={toHeaderUser(session)} nav={nav} newsAlert={newsAlert} />
      <main className="flex-1">
        <Hero />
        <LatestNewsMedia items={newsItems} />
        <EventsMedia events={events} media={media} social={settings.social} />
        <Legitimacy />
        <Framework />
      </main>
      <SiteFooter />
    </div>
  )
}

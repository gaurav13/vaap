import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Hero } from "@/components/home/hero"
import { Legitimacy } from "@/components/home/legitimacy"
import { Framework } from "@/components/home/framework"
import { NewsEvents } from "@/components/home/news-events"
import { getSession } from "@/lib/session"
import { getMenuItems, getNewsAlert } from "@/lib/site-settings"
import { getPublishedNews, getPublishedEvents } from "@/app/actions/public"
import { toHeaderUser } from "@/lib/header-user"

export default async function Home() {
  const [session, nav, news, events, newsAlert] = await Promise.all([
    getSession(),
    getMenuItems(),
    getPublishedNews(3),
    getPublishedEvents(3),
    getNewsAlert(),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader variant="solid" active="Home" user={toHeaderUser(session)} nav={nav} newsAlert={newsAlert} />
      <main className="flex-1">
        <Hero />
        <Legitimacy />
        <Framework />
        <NewsEvents news={news} events={events} />
      </main>
      <SiteFooter />
    </div>
  )
}

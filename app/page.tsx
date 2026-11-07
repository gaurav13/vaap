import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Hero } from "@/components/home/hero"
import { Legitimacy } from "@/components/home/legitimacy"
import { Framework } from "@/components/home/framework"
import { LatestNewsMedia, type HomeNewsItem } from "@/components/home/latest-news-media"
import { getPublishedArticles } from "@/app/actions/articles"
import { EventsMedia } from "@/components/home/events-media"
import { getSession } from "@/lib/session"
import { getMenuItems, getNewsAlert, getSiteSettings } from "@/lib/site-settings"
import { getPublishedNews, getPublishedEvents } from "@/app/actions/public"
import { getMediaHighlights } from "@/app/actions/cms"
import { toHeaderUser } from "@/lib/header-user"
import { seoMetadata } from "@/lib/seo"
import { staticSubjectByPath } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"

export function generateMetadata() {
  return seoMetadata(staticSubjectByPath('/'))
}

export default async function Home() {
  const [session, nav, news, articles, events, newsAlert, media, settings] = await Promise.all([
    getSession(),
    getMenuItems(),
    getPublishedNews(24),
    getPublishedArticles(),
    getPublishedEvents(3),
    getNewsAlert(),
    getMediaHighlights(3),
    getSiteSettings(),
  ])

  const newsItems: HomeNewsItem[] = [
    ...news.map((n) => ({
      key: `news-${n.id}`,
      href: `/news/${n.id}`,
      title: n.title,
      category: n.category,
      excerpt: n.excerpt,
      image: n.image,
      publisherName: n.publisherName,
      publisherLogo: n.publisherLogo,
      externalUrl: n.externalUrl,
      createdAt: n.createdAt.toISOString(),
    })),
    ...articles.slice(0, 24).map((a) => ({
      key: `article-${a.id}`,
      href: `/insights/${a.slug}`,
      title: a.title,
      category: a.category,
      excerpt: a.excerpt ?? "",
      image: a.image,
      publisherName: "VAAP",
      authorName: a.authorName?.trim() || null,
      publisherLogo: null,
      externalUrl: null,
      createdAt: (a.publishedAt ?? new Date(0)).toISOString(),
    })),
  ].sort((x, y) => y.createdAt.localeCompare(x.createdAt))

  return (
    <>
      <SeoJsonLd subject={staticSubjectByPath('/')} />
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
    </>
  )
}

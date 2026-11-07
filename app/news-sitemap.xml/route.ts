import { and, eq, gte } from "drizzle-orm"
import { db } from "@/lib/db"
import { articles, news } from "@/lib/db/schema"
import { getAllSeoOverrides, getSeoGlobals } from "@/lib/seo/config"

export const dynamic = "force-dynamic"

function xml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
}

// Google News sitemap: only items published in the last 48 hours, per Google's spec.
export async function GET() {
  const [seo, overrides] = await Promise.all([getSeoGlobals(), getAllSeoOverrides()])
  const since = new Date(Date.now() - 48 * 3600 * 1000)
  const hidden = (key: string) => {
    const o = overrides.get(key)
    return Boolean(o?.published && o.noindex)
  }
  const items: { loc: string; title: string; date: Date }[] = []
  try {
    const recentNews = await db
      .select({ id: news.id, title: news.title, createdAt: news.createdAt })
      .from(news)
      .where(and(eq(news.published, true), gte(news.createdAt, since)))
    for (const n of recentNews)
      if (!hidden(`news:${n.id}`)) items.push({ loc: `${seo.siteUrl}/news/${n.id}`, title: n.title, date: n.createdAt })
    const recentArticles = await db
      .select({ slug: articles.slug, title: articles.title, publishedAt: articles.publishedAt })
      .from(articles)
      .where(and(eq(articles.status, "published"), gte(articles.publishedAt, since)))
    for (const a of recentArticles)
      if (a.publishedAt && !hidden(`article:${a.slug}`))
        items.push({ loc: `${seo.siteUrl}/insights/${a.slug}`, title: a.title, date: a.publishedAt })
  } catch {
    // Return an empty, valid sitemap if the database is unavailable.
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items
  .map(
    (i) => `  <url>
    <loc>${xml(i.loc)}</loc>
    <news:news>
      <news:publication><news:name>${xml(seo.legalName)}</news:name><news:language>en</news:language></news:publication>
      <news:publication_date>${i.date.toISOString()}</news:publication_date>
      <news:title>${xml(i.title)}</news:title>
    </news:news>
  </url>`,
  )
  .join("\n")}
</urlset>`
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600" },
  })
}

import type { MetadataRoute } from "next"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { pages, news, events, articles, leadership } from "@/lib/db/schema"
import { getMenuItems } from "@/lib/site-settings"
import { getCoreRouteState } from "@/lib/core-routes"
import { getPublicKols } from "@/lib/kol"
import { getAllSeoOverrides, getSeoGlobals } from "@/lib/seo/config"

// Regenerate on every request so newly created pages, menu items, or CMS pages
// appear in the sitemap immediately — no manual editing or redeploy needed.
export const dynamic = "force-dynamic"


export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ siteUrl: base }, overrides] = await Promise.all([getSeoGlobals(), getAllSeoOverrides()])
  const now = new Date()
  // Paths an admin marked noindex in the SEO dashboard stay out of the sitemap.
  const noindexPaths = new Set<string>()
  const noindexKeys = new Set([...overrides.values()].filter((o) => o.published && o.noindex).map((o) => o.key))
  for (const key of noindexKeys) if (key.startsWith("page:") || key.startsWith("cms:")) noindexPaths.add(key.split(":")[1])

  // De-duplicate by clean path; later writes win so CMS lastModified beats "now".
  const entries = new Map<string, { url: string; lastModified: Date }>()

  const { visible, hiddenSet } = await getCoreRouteState()

  const add = (rawPath: string, lastModified: Date = now, key?: string) => {
    if (!rawPath || /^(https?:)?\/\//.test(rawPath) || /^(mailto:|tel:|#)/.test(rawPath)) return
    const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`
    if (hiddenSet.has(path) || noindexPaths.has(path) || (key && noindexKeys.has(key))) return
    if (/^\/(admin|dashboard|api|sign-in|sign-up|login)(\/|$)/.test(path)) return
    entries.set(path, { url: `${base}${path === "/" ? "" : path}`, lastModified })
  }

  visible.forEach((route) => add(route.href))

  // Navigation menu (top-level items and their sub-items).
  try {
    const menu = await getMenuItems()
    for (const item of menu) {
      add(item.href)
      for (const child of item.children ?? []) add(child.href)
    }
  } catch {
    // Menu is best-effort; core routes and pages still populate the sitemap.
  }

  // Published CMS pages, keyed by their clean URL.
  try {
    const publishedPages = await db.select().from(pages).where(eq(pages.status, "published"))
    for (const page of publishedPages) {
      const url = `/${page.parentSlug ? `${page.parentSlug}/` : ""}${page.slug}`
      add(url, page.updatedAt ?? now)
    }
  } catch {
    // Ignore DB errors so the sitemap still returns core + menu routes.
  }

  // Published news posts, each at its own detail URL.
  try {
    const publishedNews = await db.select().from(news).where(eq(news.published, true))
    for (const post of publishedNews) {
      add(`/news/${post.id}`, post.createdAt ?? now, `news:${post.id}`)
    }
  } catch {
    // Ignore DB errors so the sitemap still returns the rest of the routes.
  }

  // Published, approved events at their slug URLs.
  try {
    const publicEvents = await db
      .select({ id: events.id, slug: events.slug, createdAt: events.createdAt })
      .from(events)
      .where(and(eq(events.published, true), eq(events.status, "approved")))
    for (const ev of publicEvents) {
      add(`/events/${ev.slug || ev.id}`, ev.createdAt ?? now, `event:${ev.id}`)
    }
  } catch {
    // Ignore DB errors so the sitemap still returns the rest of the routes.
  }

  try {
    const published = await db
      .select({ slug: articles.slug, publishedAt: articles.publishedAt, updatedAt: articles.updatedAt })
      .from(articles)
      .where(eq(articles.status, "published"))
    for (const a of published) add(`/insights/${a.slug}`, a.updatedAt ?? a.publishedAt ?? now, `article:${a.slug}`)
  } catch {
    // Best-effort.
  }

  try {
    const people = await db.select({ id: leadership.id, createdAt: leadership.createdAt }).from(leadership).where(eq(leadership.published, true))
    for (const p of people) add(`/team/${p.id}`, p.createdAt ?? now, `team:${p.id}`)
  } catch {
    // Best-effort.
  }

  try {
    const kols = await getPublicKols()
    for (const k of kols) add(`/membership/verified-opinion-leaders/${k.slug}`, k.updatedAt ?? now, `kol:${k.slug}`)
  } catch {
    // Best-effort.
  }

  return [...entries.values()]
}

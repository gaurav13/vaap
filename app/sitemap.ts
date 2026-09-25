import type { MetadataRoute } from "next"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { pages, news } from "@/lib/db/schema"
import { getMenuItems } from "@/lib/site-settings"

// Regenerate on every request so newly created pages, menu items, or CMS pages
// appear in the sitemap immediately — no manual editing or redeploy needed.
export const dynamic = "force-dynamic"

// Built-in routes that always exist in the app.
const CORE_ROUTES = [
  "/",
  "/about",
  "/governance",
  "/voting",
  "/voting/active",
  "/voting/upcoming",
  "/voting/results",
  "/voting/guidelines",
  "/voting/proposals",
  "/voting/elections",
  "/voting/verify",
  "/voting/register",
  "/committees",
  "/membership",
  "/membership/apply",
  "/membership/verify",
  "/ecosystem",
  "/knowledge",
  "/community",
  "/news",
  "/events",
  "/contact",
]

function resolveBaseUrl() {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL
  if (candidate) return candidate.startsWith("http") ? candidate : `https://${candidate}`
  return "http://localhost:3000"
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveBaseUrl()
  const now = new Date()

  // De-duplicate by clean path; later writes win so CMS lastModified beats "now".
  const entries = new Map<string, { url: string; lastModified: Date }>()

  const add = (rawPath: string, lastModified: Date = now) => {
    if (!rawPath || /^(https?:)?\/\//.test(rawPath) || /^(mailto:|tel:)/.test(rawPath)) return
    const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`
    entries.set(path, { url: `${base}${path === "/" ? "" : path}`, lastModified })
  }

  CORE_ROUTES.forEach((route) => add(route))

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
      add(`/news/${post.id}`, post.createdAt ?? now)
    }
  } catch {
    // Ignore DB errors so the sitemap still returns the rest of the routes.
  }

  return [...entries.values()]
}

import type { MetadataRoute } from "next"
import { getSeoGlobals } from "@/lib/seo/config"

export const dynamic = "force-dynamic"

const PRIVATE_PATHS = ["/admin", "/dashboard", "/api/", "/sign-in", "/sign-up", "/login", "/p/"]
// Crawlers that collect content to train AI models (not search engines).
const AI_TRAINING_BOTS = ["GPTBot", "Google-Extended", "CCBot", "anthropic-ai", "ClaudeBot", "Bytespider", "Applebot-Extended"]
// AI answer/search engines that cite and link back to sources.
const AI_SEARCH_BOTS = ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot"]

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSeoGlobals()
  const rules: MetadataRoute.Robots["rules"] = [
    seo.allowSearchCrawlers
      ? { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }
      : { userAgent: "*", disallow: "/" },
  ]
  if (seo.allowSearchCrawlers) {
    rules.push({ userAgent: AI_SEARCH_BOTS, allow: "/", disallow: PRIVATE_PATHS })
    rules.push(
      seo.allowAiTraining
        ? { userAgent: AI_TRAINING_BOTS, allow: "/", disallow: PRIVATE_PATHS }
        : { userAgent: AI_TRAINING_BOTS, disallow: "/" },
    )
  }
  return {
    rules,
    sitemap: [`${seo.siteUrl}/sitemap.xml`, `${seo.siteUrl}/news-sitemap.xml`],
    host: seo.siteUrl,
  }
}

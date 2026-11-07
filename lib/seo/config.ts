import { cache } from "react"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { seoEntries, settings } from "@/lib/db/schema"
import { DEFAULT_SEO_GLOBALS, type SeoGlobals, type SeoOverride } from "./shared"

export const SEO_SETTINGS_KEY = "seo"

export const getSeoGlobals = cache(async (): Promise<SeoGlobals> => {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, SEO_SETTINGS_KEY)).limit(1)
    const parsed = row?.value ? (JSON.parse(row.value) as Partial<SeoGlobals>) : {}
    const merged = { ...DEFAULT_SEO_GLOBALS, ...parsed }
    merged.siteUrl = normalizeSiteUrl(merged.siteUrl)
    return merged
  } catch {
    return DEFAULT_SEO_GLOBALS
  }
})

export function normalizeSiteUrl(value: string) {
  const raw = (value || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SEO_GLOBALS.siteUrl).trim()
  const withProto = /^https?:\/\//.test(raw) ? raw : `https://${raw}`
  return withProto.replace(/\/+$/, "")
}

function toOverride(row: typeof seoEntries.$inferSelect): SeoOverride {
  return { ...row, extra: (row.extra ?? {}) as Record<string, string> }
}

/** Published override for a page/entity, or null when the admin has not customised it. */
export const getSeoOverride = cache(async (key: string): Promise<SeoOverride | null> => {
  try {
    const [row] = await db.select().from(seoEntries).where(eq(seoEntries.key, key)).limit(1)
    if (!row || !row.published) return null
    return toOverride(row)
  } catch {
    return null
  }
})

export async function getAllSeoOverrides(): Promise<Map<string, SeoOverride>> {
  try {
    const rows = await db.select().from(seoEntries)
    return new Map(rows.map((r) => [r.key, toOverride(r)]))
  } catch {
    return new Map()
  }
}

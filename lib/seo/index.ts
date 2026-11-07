import { cache } from "react"
import type { Metadata } from "next"
import { getSiteSettings } from "@/lib/site-settings"
import { getSeoGlobals, getSeoOverride } from "./config"
import { buildJsonLd, buildMetadata, resolveSeo, type SeoSubject } from "./resolve"

export const getOrgSameAs = cache(async () => {
  try {
    const { social } = await getSiteSettings()
    return Object.values(social ?? {}).filter((v): v is string => typeof v === "string" && /^https?:\/\//.test(v))
  } catch {
    return []
  }
})

/** Resolves SEO for a subject using its published admin override (if any). */
export async function loadSeo(subject: SeoSubject) {
  const [globals, override, sameAs] = await Promise.all([getSeoGlobals(), getSeoOverride(subject.key), getOrgSameAs()])
  const resolved = resolveSeo(subject, override, globals)
  const { jsonLd } = buildJsonLd(subject, resolved, globals, { sameAs, extra: override?.extra ?? {} })
  return { globals, resolved, jsonLd, metadata: buildMetadata(subject, resolved, globals) }
}

export async function seoMetadata(subject: SeoSubject): Promise<Metadata> {
  return (await loadSeo(subject)).metadata
}

export type { SeoSubject } from "./resolve"

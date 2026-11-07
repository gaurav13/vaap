export const NEWS_CATEGORIES = [
  "Media Coverage",
  "VAAP Updates",
  "Industry News",
  "Industry Update",
  "Partnership",
  "Community",
  "Announcement",
  "Education",
] as const

export const NEWS_TABS = ["All Updates", "Media Coverage", "VAAP Updates", "Industry News"] as const
export type NewsTab = (typeof NEWS_TABS)[number]

const VAAP_GROUP = new Set(["VAAP Updates", "Announcement", "Community", "Partnership"])
const INDUSTRY_GROUP = new Set(["Industry News", "Industry Update", "Education", "Insight", "Policy", "Research"])

export function newsTabFor(item: { category: string; externalUrl: string | null }): NewsTab {
  if (item.category === "Media Coverage") return "Media Coverage"
  if (VAAP_GROUP.has(item.category)) return "VAAP Updates"
  if (INDUSTRY_GROUP.has(item.category)) return "Industry News"
  return item.externalUrl ? "Media Coverage" : "Industry News"
}

export function normalizeUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(withScheme)
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

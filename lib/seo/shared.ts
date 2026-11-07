// Client-safe SEO types, limits and audit rules (no database access here).

export type SeoKind = "page" | "news" | "article" | "event" | "team" | "kol" | "cms"

export const SEO_KIND_LABELS: Record<SeoKind, string> = {
  page: "Page",
  cms: "CMS Page",
  news: "News",
  article: "Article",
  event: "Event",
  team: "Team Member",
  kol: "Verified KOL",
}

export const TITLE_MAX = 60
export const DESCRIPTION_MAX = 160
export const OG_IMAGE_SIZE = { width: 1200, height: 630 }

export type EventExtra = {
  endDate?: string
  timezone?: string
  eventStatus?: string
  venueName?: string
  streetAddress?: string
  registrationUrl?: string
  price?: string
  currency?: string
  availability?: string
}

export type SeoOverride = {
  key: string
  seoTitle: string
  metaDescription: string
  keywords: string
  canonicalUrl: string
  noindex: boolean
  ogTitle: string
  ogDescription: string
  ogImage: string
  twitterTitle: string
  twitterDescription: string
  twitterImage: string
  customSchema: string
  extra: Record<string, string>
  published: boolean
  updatedAt?: string | Date | null
}

export const EMPTY_OVERRIDE: Omit<SeoOverride, "key"> = {
  seoTitle: "",
  metaDescription: "",
  keywords: "",
  canonicalUrl: "",
  noindex: false,
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  customSchema: "",
  extra: {},
  published: true,
}

export type SeoGlobals = {
  siteName: string
  legalName: string
  siteUrl: string
  titleSuffix: string
  defaultDescription: string
  defaultOgImage: string
  logo: string
  locale: string
  twitterHandle: string
  contactEmail: string
  contactPhone: string
  address: string
  googleVerification: string
  bingVerification: string
  allowSearchCrawlers: boolean
  allowAiTraining: boolean
}

export const DEFAULT_SEO_GLOBALS: SeoGlobals = {
  siteName: "VAAP",
  legalName: "Virtual Asset Industry Alliance of Pakistan",
  siteUrl: "https://vaap.org.pk",
  titleSuffix: " | VAAP",
  defaultDescription:
    "Building a responsible, innovative and connected virtual asset ecosystem for Pakistan. People. Innovation. Collaboration.",
  defaultOgImage: "/images/hero-islamabad.png",
  logo: "/vaap-logo.png",
  locale: "en_PK",
  twitterHandle: "",
  contactEmail: "",
  contactPhone: "",
  address: "Islamabad, Pakistan",
  googleVerification: "",
  bingVerification: "",
  allowSearchCrawlers: true,
  allowAiTraining: false,
}

export type ResolvedSeo = {
  title: string
  description: string
  keywords: string[]
  canonical: string
  noindex: boolean
  ogTitle: string
  ogDescription: string
  ogImage: string
  ogImageAlt: string
  ogImageIsFallback: boolean
  ogType: "website" | "article" | "profile"
  twitterTitle: string
  twitterDescription: string
  twitterImage: string
  customSchema: string
}

export type AuditIssue = { level: "error" | "warning" | "info"; message: string }

export function clip(text: string | null | undefined, max: number) {
  const clean = (text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

/** JSON-LD checks for the fields Google requires on the schema types we emit. */
export function validateJsonLd(graph: unknown): AuditIssue[] {
  const issues: AuditIssue[] = []
  const nodes: Record<string, unknown>[] = []
  const collect = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(collect)
    else if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>
      if (obj["@graph"]) collect(obj["@graph"])
      else nodes.push(obj)
    }
  }
  collect(graph)
  if (nodes.length === 0) issues.push({ level: "error", message: "No structured data generated." })
  const required: Record<string, string[]> = {
    NewsArticle: ["headline", "datePublished", "image", "author", "publisher"],
    Article: ["headline", "datePublished", "author", "publisher"],
    Event: ["name", "startDate", "location"],
    Person: ["name"],
    Organization: ["name", "url"],
    WebSite: ["name", "url"],
    BreadcrumbList: ["itemListElement"],
  }
  for (const node of nodes) {
    const type = String(node["@type"] ?? "")
    if (!type) {
      issues.push({ level: "error", message: "A schema node is missing @type." })
      continue
    }
    for (const field of required[type] ?? []) {
      const v = node[field]
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
        issues.push({ level: "error", message: `${type} is missing required "${field}".` })
      }
    }
    if (type === "Event") {
      if (!node.image) issues.push({ level: "warning", message: "Event has no image (recommended by Google)." })
      if (!node.endDate) issues.push({ level: "warning", message: "Event has no endDate (recommended)." })
      if (!node.offers) issues.push({ level: "info", message: "Event has no ticket/offer information." })
    }
  }
  return issues
}

export function auditSeo(input: {
  resolved: ResolvedSeo
  expectedCanonical: string
  jsonLd: unknown
  customSchemaError?: string | null
  contentHtml?: string
  inSitemap: boolean
}): AuditIssue[] {
  const { resolved: r } = input
  const issues: AuditIssue[] = []
  if (!r.title) issues.push({ level: "error", message: "Missing SEO title." })
  else if (r.title.length > TITLE_MAX)
    issues.push({ level: "warning", message: `Title is ${r.title.length} characters (aim for ≤ ${TITLE_MAX}).` })
  if (!r.description) issues.push({ level: "error", message: "Missing meta description." })
  else if (r.description.length < 50) issues.push({ level: "warning", message: "Meta description is very short." })
  else if (r.description.length > DESCRIPTION_MAX)
    issues.push({ level: "warning", message: `Description is ${r.description.length} characters (aim for ≤ ${DESCRIPTION_MAX}).` })
  if (!r.ogImage) issues.push({ level: "error", message: "Missing social sharing image." })
  else if (r.ogImageIsFallback)
    issues.push({ level: "warning", message: "Using the site fallback image — add a page-specific banner." })
  if (r.ogImage && !r.ogImage.startsWith("https://"))
    issues.push({ level: "error", message: "Social image must be an absolute HTTPS URL." })
  if (!/^https:\/\//.test(r.canonical)) issues.push({ level: "error", message: "Canonical URL is not absolute HTTPS." })
  else if (r.canonical.replace(/\/$/, "") !== input.expectedCanonical.replace(/\/$/, ""))
    issues.push({ level: "warning", message: `Canonical points elsewhere: ${r.canonical}` })
  if (r.noindex) issues.push({ level: "warning", message: "Page is set to noindex — hidden from search engines." })
  if (input.customSchemaError) issues.push({ level: "error", message: `Custom schema: ${input.customSchemaError}` })
  issues.push(...validateJsonLd(input.jsonLd))
  if (input.contentHtml) {
    const missingAlt = (input.contentHtml.match(/<img\b(?![^>]*\balt=["'][^"']+["'])[^>]*>/gi) ?? []).length
    if (missingAlt > 0)
      issues.push({ level: "warning", message: `${missingAlt} image(s) in the content have no alt text.` })
  }
  if (!input.inSitemap) issues.push({ level: "info", message: "Not included in the XML sitemap." })
  return issues
}

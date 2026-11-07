import type { Metadata } from "next"
import {
  DESCRIPTION_MAX,
  clip,
  type ResolvedSeo,
  type SeoGlobals,
  type SeoKind,
  type SeoOverride,
} from "./shared"

export type JsonLdNode = Record<string, unknown>

export type SchemaContext = {
  globals: SeoGlobals
  seo: ResolvedSeo
  url: string
  orgId: string
  websiteId: string
  pageId: string
  abs: (url: string | null | undefined) => string
  extra: Record<string, string>
}

export type SeoSubject = {
  key: string
  kind: SeoKind
  label: string
  path: string
  title: string
  description: string
  image?: string | null
  imageAlt?: string
  ogType?: "website" | "article" | "profile"
  fullTitle?: boolean
  publishedTime?: Date | string | null
  modifiedTime?: Date | string | null
  authors?: string[]
  section?: string
  tags?: string[]
  keywords?: string[]
  breadcrumbs?: { name: string; path: string }[]
  contentHtml?: string
  noindex?: boolean
  schema: (ctx: SchemaContext) => JsonLdNode[]
}

export function absoluteUrl(url: string | null | undefined, siteUrl: string) {
  const value = (url ?? "").trim()
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return ""
  if (value.startsWith("//")) return `https:${value}`
  if (/^https?:\/\//i.test(value)) return value.replace(/^http:\/\//i, "https://")
  return `${siteUrl}${value.startsWith("/") ? "" : "/"}${value}`
}

function iso(value: Date | string | null | undefined) {
  if (!value) return undefined
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

export function resolveSeo(subject: SeoSubject, override: SeoOverride | null, globals: SeoGlobals): ResolvedSeo {
  const o = override
  const abs = (u: string | null | undefined) => absoluteUrl(u, globals.siteUrl)
  const baseTitle = subject.fullTitle ? subject.title : `${subject.title}${globals.titleSuffix}`
  const title = (o?.seoTitle || baseTitle).trim()
  const description = clip(o?.metaDescription || subject.description || globals.defaultDescription, DESCRIPTION_MAX)
  const pageImage = abs(o?.ogImage) || abs(subject.image)
  const ogImage = pageImage || abs(globals.defaultOgImage)
  const ogTitle = (o?.ogTitle || o?.seoTitle || subject.title).trim()
  const ogDescription = clip(o?.ogDescription || description, 200)
  const keywords = [
    ...(o?.keywords ? o.keywords.split(",") : subject.keywords ?? []),
  ]
    .map((k) => k.trim())
    .filter(Boolean)
  return {
    title,
    description,
    keywords,
    canonical: abs(o?.canonicalUrl) || abs(subject.path === "/" ? "/" : subject.path).replace(/\/$/, "") || globals.siteUrl,
    noindex: Boolean(o?.noindex || subject.noindex),
    ogTitle,
    ogDescription,
    ogImage,
    ogImageAlt: subject.imageAlt || subject.title,
    ogImageIsFallback: !pageImage,
    ogType: subject.ogType ?? "website",
    twitterTitle: (o?.twitterTitle || ogTitle).trim(),
    twitterDescription: clip(o?.twitterDescription || ogDescription, 200),
    twitterImage: abs(o?.twitterImage) || ogImage,
    customSchema: o?.customSchema ?? "",
  }
}

export function buildMetadata(subject: SeoSubject, r: ResolvedSeo, globals: SeoGlobals): Metadata {
  const images = r.ogImage ? [{ url: r.ogImage, alt: r.ogImageAlt }] : undefined
  const openGraph: Record<string, unknown> = {
    type: r.ogType,
    url: r.canonical,
    siteName: globals.siteName,
    locale: globals.locale,
    title: r.ogTitle,
    description: r.ogDescription,
    images,
  }
  if (r.ogType === "article") {
    openGraph.publishedTime = iso(subject.publishedTime)
    openGraph.modifiedTime = iso(subject.modifiedTime ?? subject.publishedTime)
    openGraph.authors = subject.authors
    openGraph.section = subject.section
    openGraph.tags = subject.tags
  }
  return {
    title: { absolute: r.title },
    description: r.description,
    keywords: r.keywords.length ? r.keywords : undefined,
    alternates: { canonical: r.canonical },
    robots: r.noindex
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
        },
    openGraph: openGraph as Metadata["openGraph"],
    twitter: {
      card: "summary_large_image",
      title: r.twitterTitle,
      description: r.twitterDescription,
      images: r.twitterImage ? [{ url: r.twitterImage, alt: r.ogImageAlt }] : undefined,
      site: globals.twitterHandle || undefined,
    },
  }
}

export function organizationNode(globals: SeoGlobals, sameAs: string[] = []): JsonLdNode {
  const abs = (u: string) => absoluteUrl(u, globals.siteUrl)
  return {
    "@type": "Organization",
    "@id": `${globals.siteUrl}/#organization`,
    name: globals.legalName,
    alternateName: globals.siteName,
    url: globals.siteUrl,
    logo: { "@type": "ImageObject", url: abs(globals.logo) },
    image: abs(globals.defaultOgImage) || undefined,
    email: globals.contactEmail || undefined,
    telephone: globals.contactPhone || undefined,
    address: globals.address ? { "@type": "PostalAddress", addressLocality: globals.address, addressCountry: "PK" } : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  }
}

export function parseCustomSchema(raw: string): { nodes: JsonLdNode[]; error: string | null } {
  const text = raw.trim()
  if (!text) return { nodes: [], error: null }
  try {
    const parsed = JSON.parse(text)
    const list = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed]
    const nodes = (list as JsonLdNode[]).filter((n) => n && typeof n === "object").map((n) => {
      const { "@context": _ctx, ...rest } = n
      return rest
    })
    return { nodes, error: null }
  } catch (err) {
    return { nodes: [], error: err instanceof Error ? err.message : "Invalid JSON" }
  }
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function buildJsonLd(
  subject: SeoSubject,
  r: ResolvedSeo,
  globals: SeoGlobals,
  opts: { sameAs?: string[]; extra?: Record<string, string> } = {},
) {
  const abs = (u: string | null | undefined) => absoluteUrl(u, globals.siteUrl)
  const ctx: SchemaContext = {
    globals,
    seo: r,
    url: r.canonical,
    orgId: `${globals.siteUrl}/#organization`,
    websiteId: `${globals.siteUrl}/#website`,
    pageId: `${r.canonical}#webpage`,
    abs,
    extra: opts.extra ?? {},
  }
  const website: JsonLdNode = {
    "@type": "WebSite",
    "@id": ctx.websiteId,
    name: globals.siteName,
    alternateName: globals.legalName,
    url: globals.siteUrl,
    publisher: { "@id": ctx.orgId },
    inLanguage: "en-PK",
  }
  const graph: JsonLdNode[] = [organizationNode(globals, opts.sameAs), website, ...subject.schema(ctx)]
  if (subject.breadcrumbs && subject.breadcrumbs.length > 1) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${r.canonical}#breadcrumb`,
      itemListElement: subject.breadcrumbs.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        item: abs(b.path === "/" ? "/" : b.path),
      })),
    })
  }
  const custom = parseCustomSchema(r.customSchema)
  graph.push(...custom.nodes)
  return { jsonLd: stripUndefined({ "@context": "https://schema.org", "@graph": graph }), customError: custom.error }
}

import type { news, articles, events, leadership, kolProfiles, pages } from "@/lib/db/schema"
import { clip } from "./shared"
import { leaderPath } from "@/lib/leadership"
import type { JsonLdNode, SchemaContext, SeoSubject } from "./resolve"
import { getStaticPage, type StaticPageDef } from "./pages"

type NewsRow = typeof news.$inferSelect
type ArticleRow = typeof articles.$inferSelect
type EventRow = typeof events.$inferSelect
type LeaderRow = typeof leadership.$inferSelect
type KolRow = typeof kolProfiles.$inferSelect
type CmsRow = typeof pages.$inferSelect

const LANG = "en-PK"

function isoDate(value: Date | string | null | undefined) {
  if (!value) return undefined
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

/** ISO 8601 with the event's UTC offset (e.g. 2026-11-20T10:00:00+05:00). */
export function zonedIso(date: Date, timeZone: string) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(date)
        .map((p) => [p.type, p.value]),
    )
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
    const offsetMin = Math.round((asUtc - date.getTime()) / 60000)
    const sign = offsetMin >= 0 ? "+" : "-"
    const abs = Math.abs(offsetMin)
    const off = `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`
    return { iso: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${off}`, offset: off }
  } catch {
    return { iso: date.toISOString(), offset: "Z" }
  }
}

function webPage(ctx: SchemaContext, type: string, extra: JsonLdNode = {}): JsonLdNode {
  return {
    "@type": type,
    "@id": ctx.pageId,
    url: ctx.url,
    name: ctx.seo.ogTitle,
    description: ctx.seo.description,
    inLanguage: LANG,
    isPartOf: { "@id": ctx.websiteId },
    publisher: { "@id": ctx.orgId },
    primaryImageOfPage: ctx.seo.ogImage ? { "@type": "ImageObject", url: ctx.seo.ogImage } : undefined,
    breadcrumb: { "@id": `${ctx.url}#breadcrumb` },
    ...extra,
  }
}

function crumbs(...items: { name: string; path: string }[]) {
  return [{ name: "Home", path: "/" }, ...items]
}

function sameAsFrom(...values: (string | null | undefined)[]) {
  return values.filter((v): v is string => Boolean(v && /^https?:\/\//.test(v)))
}

// --- Static pages ------------------------------------------------------------

export function staticSubject(def: StaticPageDef, opts: { people?: LeaderRow[] } = {}): SeoSubject {
  const parent = def.parent ? getStaticPage(def.parent) : undefined
  const breadcrumbs =
    def.path === "/"
      ? undefined
      : crumbs(...(parent ? [{ name: parent.label, path: parent.path }] : []), { name: def.label, path: def.path })
  return {
    key: `page:${def.path}`,
    kind: "page",
    label: def.label,
    path: def.path,
    title: def.title,
    description: def.description,
    fullTitle: def.fullTitle,
    noindex: def.noindex,
    image: def.image,
    imageAlt: def.image ? def.label : undefined,
    breadcrumbs,
    schema: (ctx) => {
      switch (def.schema) {
        case "home":
          return [webPage(ctx, "WebPage", { about: { "@id": ctx.orgId }, breadcrumb: undefined })]
        case "about":
          return [webPage(ctx, "AboutPage", { mainEntity: { "@id": ctx.orgId } })]
        case "contact":
          return [webPage(ctx, "ContactPage", { mainEntity: { "@id": ctx.orgId } })]
        case "team":
          return [
            webPage(ctx, "AboutPage", {
              mainEntity: {
                "@type": "ItemList",
                itemListElement: (opts.people ?? []).map((p, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  item: {
                    "@type": "Person",
                    name: p.name,
                    jobTitle: p.position || undefined,
                    image: ctx.abs(p.photo) || undefined,
                    url: ctx.abs(leaderPath(p)),
                    worksFor: { "@id": ctx.orgId },
                  },
                })),
              },
            }),
          ]
        case "collection":
        case "profiles":
          return [webPage(ctx, "CollectionPage")]
        case "membership":
          return [webPage(ctx, "WebPage", { about: { "@id": ctx.orgId } })]
        default:
          return [webPage(ctx, "WebPage")]
      }
    },
  }
}

export function staticSubjectByPath(path: string, opts?: { people?: LeaderRow[] }) {
  const def = getStaticPage(path)
  if (!def) throw new Error(`Unknown static SEO page: ${path}`)
  return staticSubject(def, opts)
}

// --- News --------------------------------------------------------------------

export function newsSubject(post: NewsRow): SeoSubject {
  const path = `/news/${post.id}`
  const isExternal = post.sourceType === "external" && Boolean(post.externalUrl)
  const description = clip(post.excerpt || post.content, 160)
  return {
    key: `news:${post.id}`,
    kind: "news",
    label: post.title,
    path,
    title: post.title,
    description,
    image: post.image,
    imageAlt: post.title,
    ogType: "article",
    publishedTime: post.createdAt,
    modifiedTime: post.createdAt,
    authors: isExternal && post.publisherName ? [post.publisherName] : ["VAAP"],
    section: post.category,
    tags: post.category ? [post.category] : undefined,
    contentHtml: post.content,
    breadcrumbs: crumbs({ name: "News", path: "/news" }, { name: clip(post.title, 70), path }),
    schema: (ctx) => {
      const image = ctx.seo.ogImage ? [ctx.seo.ogImage] : undefined
      const base: JsonLdNode = {
        "@id": `${ctx.url}#article`,
        headline: clip(post.title, 110),
        description: ctx.seo.description,
        image,
        datePublished: isoDate(post.createdAt),
        dateModified: isoDate(post.createdAt),
        mainEntityOfPage: { "@id": ctx.pageId },
        inLanguage: LANG,
        articleSection: post.category || undefined,
        publisher: { "@id": ctx.orgId },
      }
      // Coverage by an outside outlet: describe this page as VAAP's summary that is
      // based on the original story, instead of claiming VAAP authored the report.
      const article: JsonLdNode = isExternal
        ? {
            "@type": "Article",
            ...base,
            author: { "@type": "Organization", name: post.publisherName || "Original publisher", url: post.externalUrl },
            isBasedOn: {
              "@type": "NewsArticle",
              url: post.externalUrl,
              headline: clip(post.title, 110),
              datePublished: isoDate(post.originalPublishedAt) ?? undefined,
              publisher: {
                "@type": "Organization",
                name: post.publisherName || undefined,
                logo: post.publisherLogo ? { "@type": "ImageObject", url: ctx.abs(post.publisherLogo) } : undefined,
              },
            },
            citation: post.externalUrl,
          }
        : { "@type": "NewsArticle", ...base, author: { "@id": ctx.orgId } }
      return [webPage(ctx, "WebPage"), article]
    },
  }
}

// --- Articles / Insights -----------------------------------------------------

export function articleSubject(a: ArticleRow): SeoSubject {
  const path = `/insights/${a.slug}`
  const author = a.authorName || "VAAP"
  const rawTags = a.tags as unknown
  const tags = Array.isArray(rawTags)
    ? (rawTags as string[])
    : String(rawTags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
  return {
    key: `article:${a.slug}`,
    kind: "article",
    label: a.title,
    path,
    title: a.seoTitle || a.title,
    fullTitle: Boolean(a.seoTitle),
    description: clip(a.seoDescription || a.excerpt || a.content, 160),
    image: a.image,
    imageAlt: a.title,
    ogType: "article",
    publishedTime: a.publishedAt ?? a.createdAt,
    modifiedTime: a.updatedAt ?? a.publishedAt ?? a.createdAt,
    authors: [author],
    section: a.category || undefined,
    tags,
    keywords: tags,
    contentHtml: a.content,
    breadcrumbs: crumbs({ name: "Insights", path: "/insights" }, { name: clip(a.title, 70), path }),
    schema: (ctx) => [
      webPage(ctx, "WebPage"),
      {
        "@type": "Article",
        "@id": `${ctx.url}#article`,
        headline: clip(a.title, 110),
        description: ctx.seo.description,
        image: ctx.seo.ogImage ? [ctx.seo.ogImage] : undefined,
        datePublished: isoDate(a.publishedAt ?? a.createdAt),
        dateModified: isoDate(a.updatedAt ?? a.publishedAt ?? a.createdAt),
        author: { "@type": a.authorName ? "Person" : "Organization", name: author, jobTitle: a.authorRole || undefined },
        publisher: { "@id": ctx.orgId },
        mainEntityOfPage: { "@id": ctx.pageId },
        articleSection: a.category || undefined,
        keywords: tags.length ? tags.join(", ") : undefined,
        inLanguage: LANG,
      },
    ],
  }
}

// --- Events ------------------------------------------------------------------

export function eventSubject(e: EventRow, path: string): SeoSubject {
  return {
    key: `event:${e.id}`,
    kind: "event",
    label: e.title,
    path,
    title: e.title,
    description: clip(e.description, 160) || "Join this VAAP event.",
    image: e.coverImage,
    imageAlt: e.title,
    contentHtml: e.description,
    breadcrumbs: crumbs({ name: "Events", path: "/events" }, { name: clip(e.title, 70), path }),
    schema: (ctx) => {
      const x = ctx.extra
      const tz = x.timezone || "Asia/Karachi"
      const start = e.startsAt ? zonedIso(new Date(e.startsAt), tz) : null
      const endDate = x.endDate
        ? /[zZ]|[+-]\d{2}:\d{2}$/.test(x.endDate)
          ? x.endDate
          : `${x.endDate.length === 16 ? `${x.endDate}:00` : x.endDate}${start?.offset ?? "+05:00"}`
        : undefined
      const format = `${e.format ?? ""}`.toLowerCase()
      const online = /online|virtual/.test(format)
      const hybrid = /hybrid/.test(format)
      const place = {
        "@type": "Place",
        name: x.venueName || e.location || e.city || "Pakistan",
        address: {
          "@type": "PostalAddress",
          streetAddress: x.streetAddress || e.location || undefined,
          addressLocality: e.city || undefined,
          addressCountry: "PK",
        },
      }
      const virtual = { "@type": "VirtualLocation", url: x.registrationUrl || ctx.url }
      const location = hybrid ? [place, virtual] : online ? virtual : place
      const offers =
        x.price !== undefined && x.price !== ""
          ? {
              "@type": "Offer",
              url: x.registrationUrl || ctx.url,
              price: x.price,
              priceCurrency: x.currency || "PKR",
              availability: `https://schema.org/${x.availability || "InStock"}`,
              validFrom: isoDate(e.createdAt),
            }
          : undefined
      return [
        webPage(ctx, "WebPage"),
        {
          "@type": "Event",
          "@id": `${ctx.url}#event`,
          name: e.title,
          description: ctx.seo.description,
          image: ctx.seo.ogImage ? [ctx.seo.ogImage] : undefined,
          startDate: start?.iso,
          endDate,
          eventStatus: `https://schema.org/${x.eventStatus || "EventScheduled"}`,
          eventAttendanceMode: `https://schema.org/${hybrid ? "MixedEventAttendanceMode" : online ? "OnlineEventAttendanceMode" : "OfflineEventAttendanceMode"}`,
          location,
          organizer: e.hostName && e.hostName !== "VAAP" ? { "@type": "Organization", name: e.hostName } : { "@id": ctx.orgId },
          offers,
          url: ctx.url,
          inLanguage: LANG,
        },
      ]
    },
  }
}

// --- Team profiles -----------------------------------------------------------

export function teamSubject(p: LeaderRow): SeoSubject {
  const path = leaderPath(p)
  const role = [p.position, p.organization].filter(Boolean).join(", ")
  return {
    key: `team:${p.id}`,
    kind: "team",
    label: p.name,
    path,
    title: `${p.name}${p.position ? ` — ${p.position}` : ""}`,
    description: clip(p.summary, 160) || clip(p.bio, 160) || `${p.name}${role ? `, ${role}` : ""} at the Virtual Asset Industry Alliance of Pakistan.`,
    image: p.photo,
    imageAlt: p.name,
    ogType: "profile",
    breadcrumbs: crumbs({ name: "Team", path: "/team" }, { name: p.name, path }),
    schema: (ctx) => [
      webPage(ctx, "ProfilePage", { mainEntity: { "@id": `${ctx.url}#person` } }),
      {
        "@type": "Person",
        "@id": `${ctx.url}#person`,
        name: p.name,
        jobTitle: p.position || undefined,
        description: clip(p.bio, 300) || undefined,
        image: ctx.abs(p.photo) || undefined,
        url: ctx.url,
        email: p.email ? `mailto:${p.email}` : undefined,
        worksFor: p.organization ? { "@type": "Organization", name: p.organization } : { "@id": ctx.orgId },
        memberOf: { "@id": ctx.orgId },
        sameAs: sameAsFrom(p.linkedin, p.x, p.facebook, p.instagram, p.website),
      },
    ],
  }
}

// --- Verified opinion leaders -----------------------------------------------

function platformUrls(platforms: unknown): string[] {
  if (!Array.isArray(platforms)) return []
  return platforms
    .map((p) => (p && typeof p === "object" ? String((p as Record<string, unknown>).url ?? "") : ""))
    .filter((u) => /^https?:\/\//.test(u))
}

export function kolSubject(k: KolRow): SeoSubject {
  const path = `/membership/verified-opinion-leaders/${k.slug}`
  const name = k.professionalName || k.fullName
  return {
    key: `kol:${k.slug}`,
    kind: "kol",
    label: name,
    path,
    title: `${name} — Verified Opinion Leader`,
    description: clip(k.bio, 160) || `${name}, a VAAP Verified Opinion Leader.`,
    image: k.photo,
    imageAlt: name,
    ogType: "profile",
    breadcrumbs: crumbs(
      { name: "Membership", path: "/membership" },
      { name: "Verified Opinion Leaders", path: "/membership/verified-opinion-leaders" },
      { name, path },
    ),
    schema: (ctx) => [
      webPage(ctx, "ProfilePage", {
        mainEntity: { "@id": `${ctx.url}#person` },
        dateModified: isoDate(k.updatedAt),
      }),
      {
        "@type": "Person",
        "@id": `${ctx.url}#person`,
        name,
        alternateName: k.professionalName && k.professionalName !== k.fullName ? k.fullName : undefined,
        jobTitle: k.title || undefined,
        description: clip(k.bio, 300) || undefined,
        image: ctx.abs(k.photo) || undefined,
        url: ctx.url,
        worksFor: k.organization ? { "@type": "Organization", name: k.organization } : undefined,
        homeLocation: k.city || k.country ? { "@type": "Place", name: [k.city, k.country].filter(Boolean).join(", ") } : undefined,
        knowsAbout: Array.isArray(k.expertise) && k.expertise.length ? k.expertise : undefined,
        memberOf: { "@id": ctx.orgId },
        sameAs: platformUrls(k.platforms),
      },
    ],
  }
}

// --- CMS pages ---------------------------------------------------------------

export function cmsSubject(page: CmsRow): SeoSubject {
  const path = `/${[page.parentSlug, page.slug].filter(Boolean).join("/")}`
  return {
    key: `cms:${path}`,
    kind: "cms",
    label: page.title,
    path,
    title: page.seoTitle || page.title,
    fullTitle: Boolean(page.seoTitle),
    description: clip(page.metaDescription || page.heroSubtitle || page.content, 160),
    image: page.heroImage,
    imageAlt: page.heroTitle || page.title,
    noindex: page.status === "draft",
    contentHtml: page.content,
    breadcrumbs: crumbs({ name: page.title, path }),
    schema: (ctx) => [webPage(ctx, "WebPage")],
  }
}

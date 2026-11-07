import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { articles, events, leadership, news, pages, seoEntries } from "@/lib/db/schema"
import { getPublicKols } from "@/lib/kol"
import { eventPath } from "@/lib/event-slug"
import { getOrgSameAs } from "./index"
import { getSeoGlobals } from "./config"
import { STATIC_PAGES, getStaticPage } from "./pages"
import { absoluteUrl, buildJsonLd, resolveSeo, type SeoSubject } from "./resolve"
import { auditSeo, type AuditIssue, type ResolvedSeo, type SeoGlobals, type SeoKind, type SeoOverride } from "./shared"
import {
  articleSubject,
  cmsSubject,
  eventSubject,
  kolSubject,
  newsSubject,
  staticSubject,
  teamSubject,
} from "./subjects"

export type CatalogItem = {
  key: string
  kind: SeoKind
  label: string
  path: string
  title: string
  description: string
  ogImage: string
  noindex: boolean
  overridden: boolean
  draft: boolean
  errors: number
  warnings: number
  issues: AuditIssue[]
  updatedAt: string | null
}

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn()
  } catch {
    return []
  }
}

async function getAllSubjects(): Promise<SeoSubject[]> {
  const [people, cms, posts, insights, evts, kols] = await Promise.all([
    safe(() => db.select().from(leadership).where(eq(leadership.published, true))),
    safe(() => db.select().from(pages).where(eq(pages.status, "published"))),
    safe(() => db.select().from(news).where(eq(news.published, true))),
    safe(() => db.select().from(articles).where(eq(articles.status, "published"))),
    safe(() =>
      db
        .select()
        .from(events)
        .where(and(eq(events.published, true), eq(events.status, "approved"))),
    ),
    safe(() => getPublicKols()),
  ])
  return [
    ...STATIC_PAGES.map((def) => staticSubject(def, def.path === "/team" ? { people } : {})),
    ...cms.map(cmsSubject),
    ...posts.map(newsSubject),
    ...insights.map(articleSubject),
    ...evts.map((e) => eventSubject(e, eventPath(e))),
    ...people.map(teamSubject),
    ...kols.map(kolSubject),
  ]
}

/** Finds the subject for a key such as "page:/about", "news:8" or "article:my-slug". */
export async function getSeoSubject(key: string): Promise<SeoSubject | null> {
  const idx = key.indexOf(":")
  if (idx < 1) return null
  const kind = key.slice(0, idx)
  const id = key.slice(idx + 1)
  const num = Number(id)
  try {
    switch (kind) {
      case "page": {
        const def = getStaticPage(id)
        if (!def) return null
        const people = def.path === "/team" ? await db.select().from(leadership).where(eq(leadership.published, true)) : []
        return staticSubject(def, { people })
      }
      case "news": {
        if (!Number.isInteger(num)) return null
        const [row] = await db.select().from(news).where(eq(news.id, num)).limit(1)
        return row ? newsSubject(row) : null
      }
      case "event": {
        if (!Number.isInteger(num)) return null
        const [row] = await db.select().from(events).where(eq(events.id, num)).limit(1)
        return row ? eventSubject(row, eventPath(row)) : null
      }
      case "team": {
        if (!Number.isInteger(num)) return null
        const [row] = await db.select().from(leadership).where(eq(leadership.id, num)).limit(1)
        return row ? teamSubject(row) : null
      }
      case "article": {
        const [row] = await db.select().from(articles).where(eq(articles.slug, id)).limit(1)
        return row ? articleSubject(row) : null
      }
      case "kol": {
        const list = await getPublicKols()
        const row = list.find((k) => k.slug === id)
        return row ? kolSubject(row) : null
      }
      case "cms": {
        const rows = await db.select().from(pages)
        const row = rows.find((p) => cmsSubject(p).key === key)
        return row ? cmsSubject(row) : null
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

/** Raw override row, including drafts (unpublished overrides). */
export async function getSeoEntryRaw(key: string): Promise<SeoOverride | null> {
  try {
    const [row] = await db.select().from(seoEntries).where(eq(seoEntries.key, key)).limit(1)
    return row ? { ...row, extra: (row.extra ?? {}) as Record<string, string> } : null
  } catch {
    return null
  }
}

async function getAllEntriesRaw(): Promise<Map<string, SeoOverride>> {
  const rows = await safe(() => db.select().from(seoEntries))
  return new Map(rows.map((r) => [r.key, { ...r, extra: (r.extra ?? {}) as Record<string, string> }]))
}

export function evaluateSubject(
  subject: SeoSubject,
  override: SeoOverride | null,
  globals: SeoGlobals,
  sameAs: string[],
): { resolved: ResolvedSeo; jsonLd: unknown; issues: AuditIssue[] } {
  const active = override?.published ? override : null
  const resolved = resolveSeo(subject, active, globals)
  const { jsonLd, customError } = buildJsonLd(subject, resolved, globals, { sameAs, extra: active?.extra ?? {} })
  const issues = auditSeo({
    resolved,
    expectedCanonical: absoluteUrl(subject.path, globals.siteUrl) || globals.siteUrl,
    jsonLd,
    customSchemaError: customError,
    contentHtml: subject.contentHtml,
    inSitemap: !resolved.noindex,
  })
  return { resolved, jsonLd, issues }
}

export async function getSeoCatalog(): Promise<CatalogItem[]> {
  const [subjects, overrides, globals, sameAs] = await Promise.all([
    getAllSubjects(),
    getAllEntriesRaw(),
    getSeoGlobals(),
    getOrgSameAs(),
  ])
  const seen = new Set<string>()
  const items: CatalogItem[] = []
  for (const subject of subjects) {
    if (seen.has(subject.key)) continue
    seen.add(subject.key)
    const override = overrides.get(subject.key) ?? null
    const { resolved, issues } = evaluateSubject(subject, override, globals, sameAs)
    items.push({
      key: subject.key,
      kind: subject.kind,
      label: subject.label,
      path: subject.path,
      title: resolved.title,
      description: resolved.description,
      ogImage: resolved.ogImage,
      noindex: resolved.noindex,
      overridden: Boolean(override?.published),
      draft: Boolean(override && !override.published),
      errors: issues.filter((i) => i.level === "error").length,
      warnings: issues.filter((i) => i.level === "warning").length,
      issues,
      updatedAt: override?.updatedAt ? new Date(override.updatedAt).toISOString() : null,
    })
  }
  return items
}

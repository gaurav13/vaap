import "server-only"

import { createHash } from "node:crypto"
import { after } from "next/server"
import { and, asc, eq, gte, isNotNull, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  aiKnowledgeSources,
  aiKnowledgeVersions,
  articles,
  events,
  leadership,
  membershipFaqs,
  membershipPlans,
  membershipPromotions,
  news,
  pages,
  settings,
} from "@/lib/db/schema"
import { leaderPath } from "@/lib/leadership"
import { getPublicKols } from "@/lib/kol"
import { richTextToPlain } from "@/lib/rich-text-plain"
import { replaceChunks } from "./knowledge"
import { SITE_GUIDES } from "./site-guides"

export type SyncScope = "leadership" | "kol" | "pages" | "news" | "articles" | "events" | "membership" | "guides"
export const SYNC_SCOPES: SyncScope[] = ["leadership", "kol", "pages", "news", "articles", "events", "membership", "guides"]

export type SiteDoc = { syncKey: string; title: string; category: string; url: string; text: string; sensitive?: boolean }

export type SyncReport = {
  scopes: SyncScope[]
  created: number
  updated: number
  unchanged: number
  removed: number
  pendingReview: number
  failed: { syncKey: string; error: string }[]
  finishedAt: string
}

/** Pages whose changes must be approved before the assistant uses them. */
const SENSITIVE_SLUGS = new Set(["privacy-policy", "terms-of-use", "terms", "disclaimer", "official-status"])
const SYSTEM_ACTOR = "system:site-sync"

const clean = (s: string | null | undefined) => richTextToPlain(s ?? "").replace(/\s+\n/g, "\n").trim()
const lines = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join("\n")
export const hashText = (text: string) => createHash("sha256").update(text).digest("hex")

async function leadershipDocs(): Promise<SiteDoc[]> {
  const rows = await db
    .select({
      id: leadership.id,
      name: leadership.name,
      slug: leadership.slug,
      kind: leadership.kind,
      position: leadership.position,
      title: leadership.title,
      organization: leadership.organization,
      responsibility: leadership.responsibility,
      portfolio: leadership.portfolio,
      summary: leadership.summary,
      bio: leadership.bio,
      message: leadership.message,
    })
    .from(leadership)
    .where(and(eq(leadership.published, true), eq(leadership.status, "approved")))
    .orderBy(asc(leadership.sortOrder))
  return rows.map((l) => ({
    syncKey: `leadership:${l.id}`,
    title: `${l.name} — ${l.position || l.kind} (VAAP leadership)`,
    category: "governance",
    url: leaderPath(l),
    text: lines(
      `${l.name} is listed on the VAAP website as ${l.position || l.kind} (${l.kind}).`,
      l.title || l.organization ? `Title / organization: ${[l.title, l.organization].filter(Boolean).join(", ")}` : "",
      l.responsibility && `Responsibility: ${clean(l.responsibility)}`,
      l.portfolio && `Portfolio: ${clean(l.portfolio)}`,
      l.summary && clean(l.summary),
      l.bio && clean(l.bio),
      l.message && `Message: ${clean(l.message)}`,
    ),
  }))
}

async function kolDocs(): Promise<SiteDoc[]> {
  const kols = await getPublicKols()
  return kols.map((k) => ({
    syncKey: `kol:${k.id}`,
    title: `${k.fullName} — Verified Opinion Leader`,
    category: "membership",
    url: `/membership/verified-opinion-leaders/${k.slug}`,
    text: lines(
      `${k.fullName}${k.professionalName ? ` (${k.professionalName})` : ""} is a VAAP Verified Opinion Leader (KOL).`,
      k.expiresAt && `Verification valid until ${k.expiresAt.toISOString().slice(0, 10)}.`,
      [k.title, k.organization, k.city].filter(Boolean).join(", "),
      k.expertise.length ? `Expertise: ${k.expertise.join(", ")}` : "",
      k.platforms.length ? `Platforms: ${k.platforms.map((p) => p.platform ?? "").filter(Boolean).join(", ")}` : "",
      clean(k.bio),
      k.achievements && `Achievements: ${clean(k.achievements)}`,
    ),
  }))
}

async function pageDocs(): Promise<SiteDoc[]> {
  const rows = await db.select().from(pages).where(eq(pages.status, "published"))
  return rows.map((p) => ({
    syncKey: `page:${p.id}`,
    title: p.title,
    category: "general",
    url: p.parentSlug ? `/${p.parentSlug}/${p.slug}` : `/${p.slug}`,
    sensitive: SENSITIVE_SLUGS.has(p.slug),
    text: lines(p.heroTitle, p.heroSubtitle, p.metaDescription, clean(p.content)),
  }))
}

async function newsDocs(): Promise<SiteDoc[]> {
  const rows = await db.select().from(news).where(eq(news.published, true))
  return rows.map((n) => ({
    syncKey: `news:${n.id}`,
    title: `News: ${n.title}`,
    category: "general",
    url: `/news/${n.id}`,
    text: lines(`${n.category} · ${(n.originalPublishedAt ?? n.createdAt).toISOString().slice(0, 10)}`, clean(n.excerpt), clean(n.content).slice(0, 6000)),
  }))
}

async function articleDocs(): Promise<SiteDoc[]> {
  const rows = await db.select().from(articles).where(eq(articles.status, "published"))
  return rows.map((a) => ({
    syncKey: `article:${a.id}`,
    title: `Insight: ${a.title}`,
    category: "general",
    url: `/insights/${a.slug}`,
    text: lines(a.authorName && `By ${a.authorName}${a.authorRole ? `, ${a.authorRole}` : ""}`, clean(a.excerpt), clean(a.content).slice(0, 8000)),
  }))
}

async function eventDocs(): Promise<SiteDoc[]> {
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.published, true), eq(events.status, "approved")))
  return rows.map((e) => ({
    syncKey: `event:${e.id}`,
    title: `Event: ${e.title}`,
    category: "events",
    url: `/events/${e.slug ?? e.id}`,
    text: lines(
      `Date: ${e.startsAt.toISOString().slice(0, 10)} ${e.timeLabel}`,
      [e.location, e.city, e.format].filter(Boolean).join(", "),
      e.hostName && `Host: ${e.hostName}`,
      clean(e.description),
    ),
  }))
}

async function membershipDocs(): Promise<SiteDoc[]> {
  const now = new Date()
  const [plans, faqs, promos] = await Promise.all([
    db.select().from(membershipPlans).where(eq(membershipPlans.published, true)).orderBy(asc(membershipPlans.sortOrder)),
    db.select().from(membershipFaqs).where(eq(membershipFaqs.published, true)).orderBy(asc(membershipFaqs.sortOrder)),
    db
      .select()
      .from(membershipPromotions)
      .where(and(eq(membershipPromotions.status, "published"), lte(membershipPromotions.startsAt, now), gte(membershipPromotions.endsAt, now))),
  ])
  const docs: SiteDoc[] = plans.map((p) => ({
    syncKey: `plan:${p.id}`,
    title: `Membership category: ${p.title}`,
    category: "membership",
    url: "/membership",
    text: lines(
      p.subtitle,
      clean(p.description),
      `Annual fee: ${p.annualFee}${p.annualFeeNote ? ` ${p.annualFeeNote}` : ""}`,
      `Admission fee (one-time): ${p.admissionFee}${p.admissionFeeNote ? ` ${p.admissionFeeNote}` : ""}`,
      `Membership term: ${p.term}`,
      p.eligibility && `Eligibility: ${clean(p.eligibility)}`,
      p.benefits && `Benefits: ${clean(p.benefits)}`,
    ),
  }))
  if (faqs.length) {
    docs.push({
      syncKey: "membership-faqs",
      title: "Membership FAQs",
      category: "membership",
      url: "/membership",
      text: faqs.map((f) => `Q: ${clean(f.question)}\nA: ${clean(f.answer)}`).join("\n\n"),
    })
  }
  for (const p of promos) {
    const planNames = plans.filter((pl) => p.planIds.length === 0 || p.planIds.includes(pl.id)).map((pl) => pl.title)
    docs.push({
      syncKey: `promotion:${p.id}`,
      title: `Membership offer: ${p.name}`,
      category: "membership",
      url: "/membership",
      text: lines(
        `${p.name}: ${p.discountType === "percent" ? `${p.discountValue}% off` : `PKR ${p.discountValue} off`} the annual fee${planNames.length ? ` for ${planNames.join(", ")}` : ""}.`,
        `Valid until ${p.endsAt.toISOString().slice(0, 10)}. The discount is applied automatically at checkout.`,
        clean(p.description),
      ),
    })
  }
  return docs
}

function guideDocs(): SiteDoc[] {
  return SITE_GUIDES.map((g) => ({
    syncKey: `guide:${g.key}`,
    title: `Guide: ${g.title}`,
    category: g.category,
    url: g.url,
    text: g.body,
  }))
}

const BUILDERS: Record<SyncScope, () => Promise<SiteDoc[]> | SiteDoc[]> = {
  leadership: leadershipDocs,
  kol: kolDocs,
  pages: pageDocs,
  news: newsDocs,
  articles: articleDocs,
  events: eventDocs,
  membership: membershipDocs,
  guides: guideDocs,
}

/** Prefix of the syncKeys each scope owns, used to remove sources whose record disappeared. */
const SCOPE_PREFIXES: Record<SyncScope, string[]> = {
  leadership: ["leadership:"],
  kol: ["kol:"],
  pages: ["page:"],
  news: ["news:"],
  articles: ["article:"],
  events: ["event:"],
  membership: ["plan:", "promotion:", "membership-faqs"],
  guides: ["guide:"],
}

async function writeVersion(sourceId: number, version: number, action: string, title: string, content: string) {
  await db.insert(aiKnowledgeVersions).values({ sourceId, version, action, title, content, changedBy: SYSTEM_ACTOR, changedByName: "Website sync" })
}

/**
 * Applies one document. Unchanged text is skipped; changed text is re-chunked and versioned.
 * Sensitive sources keep their live chunks and park the new text in pendingContent for review.
 */
async function applyDoc(doc: SiteDoc, existing: typeof aiKnowledgeSources.$inferSelect | undefined) {
  const hash = hashText(doc.text)
  const now = new Date()
  if (!existing) {
    const status = doc.sensitive ? "pending" : "approved"
    const [row] = await db
      .insert(aiKnowledgeSources)
      .values({
        title: doc.title.slice(0, 200),
        kind: "site",
        category: doc.category,
        sourceUrl: doc.url,
        content: doc.text,
        charCount: doc.text.length,
        status,
        requiresReview: Boolean(doc.sensitive),
        syncKey: doc.syncKey,
        contentHash: hash,
        lastSyncedAt: now,
        createdBy: SYSTEM_ACTOR,
        ...(status === "approved" ? { reviewedBy: SYSTEM_ACTOR, reviewedAt: now } : {}),
      })
      .returning({ id: aiKnowledgeSources.id })
    const chunkCount = await replaceChunks(row.id, doc.text)
    await db.update(aiKnowledgeSources).set({ chunkCount }).where(eq(aiKnowledgeSources.id, row.id))
    await writeVersion(row.id, 1, "created", doc.title, doc.text)
    return doc.sensitive ? "pending" : "created"
  }

  if (existing.contentHash === hash && existing.title === doc.title.slice(0, 200) && existing.sourceUrl === doc.url) {
    await db.update(aiKnowledgeSources).set({ lastSyncedAt: now, syncError: null }).where(eq(aiKnowledgeSources.id, existing.id))
    return "unchanged"
  }

  if (doc.sensitive && existing.status === "approved") {
    if (existing.pendingContent === doc.text) return "unchanged"
    await db
      .update(aiKnowledgeSources)
      .set({ pendingContent: doc.text, requiresReview: true, lastSyncedAt: now, syncError: null, updatedAt: now })
      .where(eq(aiKnowledgeSources.id, existing.id))
    return "pending"
  }

  const version = existing.version + 1
  const chunkCount = await replaceChunks(existing.id, doc.text)
  await db
    .update(aiKnowledgeSources)
    .set({
      title: doc.title.slice(0, 200),
      category: doc.category,
      sourceUrl: doc.url,
      content: doc.text,
      charCount: doc.text.length,
      chunkCount,
      contentHash: hash,
      version,
      lastSyncedAt: now,
      syncError: null,
      updatedAt: now,
    })
    .where(eq(aiKnowledgeSources.id, existing.id))
  await writeVersion(existing.id, version, "refreshed", doc.title, doc.text)
  return doc.sensitive ? "pending" : "updated"
}

/** Syncs published website content into the assistant's knowledge base. Safe to run repeatedly. */
export async function syncSiteKnowledge(scopes: SyncScope[] = SYNC_SCOPES): Promise<SyncReport> {
  const report: SyncReport = { scopes, created: 0, updated: 0, unchanged: 0, removed: 0, pendingReview: 0, failed: [], finishedAt: "" }
  const existingRows = await db.select().from(aiKnowledgeSources).where(isNotNull(aiKnowledgeSources.syncKey))
  const byKey = new Map(existingRows.map((r) => [r.syncKey as string, r]))

  for (const scope of scopes) {
    let docs: SiteDoc[]
    try {
      docs = await BUILDERS[scope]()
    } catch (e) {
      report.failed.push({ syncKey: scope, error: (e as Error).message })
      continue
    }
    const seen = new Set<string>()
    for (const doc of docs) {
      if (!doc.text.trim() || seen.has(doc.syncKey)) continue
      seen.add(doc.syncKey)
      const existing = byKey.get(doc.syncKey)
      try {
        const result = await applyDoc(doc, existing)
        if (result === "created") report.created++
        else if (result === "updated") report.updated++
        else if (result === "pending") report.pendingReview++
        else report.unchanged++
      } catch (e) {
        const error = (e as Error).message.slice(0, 500)
        report.failed.push({ syncKey: doc.syncKey, error })
        if (existing) await db.update(aiKnowledgeSources).set({ syncError: error }).where(eq(aiKnowledgeSources.id, existing.id)).catch(() => {})
      }
    }
    // A record that was deleted or unpublished must stop being used by the assistant.
    for (const row of existingRows) {
      const key = row.syncKey as string
      if (!SCOPE_PREFIXES[scope].some((p) => key.startsWith(p)) || seen.has(key)) continue
      await db.delete(aiKnowledgeSources).where(eq(aiKnowledgeSources.id, row.id))
      report.removed++
    }
  }

  report.finishedAt = new Date().toISOString()
  await db
    .insert(settings)
    .values({ key: "ai_site_sync_last", value: JSON.stringify(report) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(report) } })
    .catch((e) => console.error("[site-sync] could not record report:", (e as Error).message))
  if (report.failed.length) console.error("[site-sync] failures:", report.failed)
  return report
}

/** Runs an incremental sync after the current response, so admin saves stay fast. */
export function queueKnowledgeSync(...scopes: SyncScope[]) {
  const run = () =>
    syncSiteKnowledge(scopes).catch((e) => console.error("[site-sync] queued sync failed:", (e as Error).message))
  try {
    after(run)
  } catch {
    void run()
  }
}

export async function getLastSyncReport(): Promise<SyncReport | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "ai_site_sync_last")).limit(1)
  if (!row?.value) return null
  try {
    return JSON.parse(String(row.value)) as SyncReport
  } catch {
    return null
  }
}

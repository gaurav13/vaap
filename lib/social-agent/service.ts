import "server-only"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { settings, socialCategorySettings, socialPosts, socialTemplates } from "@/lib/db/schema"
import { notify } from "@/lib/notifications"
import { uploadPageImage } from "@/lib/spaces"
import { generateCaptions } from "@/lib/social-agent/captions"
import {
  CATEGORIES,
  DEFAULT_RULES,
  PLATFORM_KEYS,
  categoryLabel,
  type CategoryKey,
  type CategoryRules,
  type PlatformKey,
} from "@/lib/social-agent/config"
import { renderBanner, renderVariants } from "@/lib/social-agent/render"
import { getSourceRecords, type SourceRecord } from "@/lib/social-agent/sources"

export const AUTOMATION_KEY = "social_agent_automation"
export type AutomationSettings = { enabled: boolean; maxPerCategory: number; lastRunAt: string | null; lastRunSummary: string }
const DEFAULT_AUTOMATION: AutomationSettings = { enabled: false, maxPerCategory: 3, lastRunAt: null, lastRunSummary: "" }

export async function getAutomation(): Promise<AutomationSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, AUTOMATION_KEY)).limit(1)
  try {
    return { ...DEFAULT_AUTOMATION, ...(row ? JSON.parse(row.value) : {}) }
  } catch {
    return DEFAULT_AUTOMATION
  }
}

export async function saveAutomation(value: AutomationSettings) {
  const json = JSON.stringify(value)
  await db
    .insert(settings)
    .values({ key: AUTOMATION_KEY, value: json })
    .onConflictDoUpdate({ target: settings.key, set: { value: json, updatedAt: new Date() } })
}

export async function getAllRules(): Promise<Record<CategoryKey, CategoryRules & { detectFrom: Date | null }>> {
  const rows = await db.select().from(socialCategorySettings)
  return Object.fromEntries(
    CATEGORIES.map((c) => {
      const r = rows.find((x) => x.category === c.key)
      const platforms = (r?.platforms ?? DEFAULT_RULES.platforms).filter((p): p is PlatformKey => PLATFORM_KEYS.includes(p as PlatformKey))
      return [
        c.key,
        r
          ? { enabled: r.enabled, autoGenerate: r.autoGenerate, captionRules: r.captionRules, hashtags: r.hashtags, platforms, detectFrom: r.detectFrom }
          : { ...DEFAULT_RULES, detectFrom: null },
      ]
    }),
  ) as Record<CategoryKey, CategoryRules & { detectFrom: Date | null }>
}

export async function getActiveTemplate(category: CategoryKey) {
  const [t] = await db
    .select()
    .from(socialTemplates)
    .where(and(eq(socialTemplates.category, category), eq(socialTemplates.active, true)))
    .orderBy(desc(socialTemplates.updatedAt))
    .limit(1)
  return t ?? null
}

async function upload(bytes: Buffer, contentType: string) {
  return uploadPageImage({ bytes: new Uint8Array(bytes), contentType, folder: "social-agent" })
}

async function renderAndUpload(template: typeof socialTemplates.$inferSelect, fields: Record<string, string>, platforms: string[]) {
  const { banner, issues } = await renderBanner(template, fields)
  const bannerUrl = await upload(banner, "image/png")
  const variants: Record<string, string> = {}
  for (const [platform, bytes] of Object.entries(await renderVariants(banner, platforms))) {
    variants[platform] = await upload(bytes, "image/jpeg")
  }
  return { bannerUrl, variants, issues }
}

const statusFor = (issues: string[]) => (issues.length ? "needs_review" : "pending_approval")

/** Detect → template → render → captions → draft → notify. Never publishes. */
export async function generateDraft(category: CategoryKey, record: SourceRecord, actorId: string | null) {
  const template = await getActiveTemplate(category)
  if (!template) throw new Error(`No active banner template for ${categoryLabel(category)}. Upload and activate one first.`)
  const rules = (await getAllRules())[category]
  const platforms = rules.platforms.length ? rules.platforms : DEFAULT_RULES.platforms

  const { bannerUrl, variants, issues } = await renderAndUpload(template, record.fields, platforms)
  const { captions, error } = await generateCaptions({ category, fields: record.fields, url: record.url, platforms, rules })
  if (error) issues.push(`Captions were not generated: ${error}`)

  const values = {
    category,
    sourceId: record.sourceId,
    sourceTitle: record.title,
    sourceUrl: record.url,
    templateId: template.id,
    fields: record.fields,
    bannerUrl,
    variants,
    captions,
    platforms,
    issues,
    status: statusFor(issues),
    createdBy: actorId,
    updatedAt: new Date(),
  }
  const [post] = await db
    .insert(socialPosts)
    .values(values)
    .onConflictDoUpdate({ target: [socialPosts.category, socialPosts.sourceId], set: values })
    .returning({ id: socialPosts.id })

  await notify({
    role: "admin",
    type: issues.length ? "alert" : "info",
    title: issues.length ? "Social post needs review" : "Social post ready for approval",
    body: `${categoryLabel(category)}: ${record.title}${issues.length ? ` (${issues.length} issue${issues.length > 1 ? "s" : ""})` : ""}`,
    link: `/admin/social-agent?tab=approvals&post=${post.id}`,
  }).catch(() => {})
  return { id: post.id, issues }
}

/** Re-renders an existing draft after the Super Admin edits its fields or replaces the template. */
export async function rerenderPost(postId: number, fields: Record<string, string>) {
  const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId)).limit(1)
  if (!post) throw new Error("Post not found")
  const template = (await getActiveTemplate(post.category as CategoryKey)) ?? null
  if (!template) throw new Error("This category has no active template.")
  const { bannerUrl, variants, issues } = await renderAndUpload(template, fields, post.platforms)
  await db
    .update(socialPosts)
    .set({ fields, bannerUrl, variants, issues, templateId: template.id, status: statusFor(issues), updatedAt: new Date() })
    .where(eq(socialPosts.id, postId))
  return { issues }
}

/** Creates drafts for newly approved records in categories with automation turned on. */
export async function runAutomationScan(actorId: string | null = null) {
  const automation = await getAutomation()
  const rules = await getAllRules()
  const summary: string[] = []
  let created = 0

  for (const c of CATEGORIES) {
    const r = rules[c.key]
    if (!r.enabled || !r.autoGenerate || !r.detectFrom) continue
    if (!(await getActiveTemplate(c.key))) {
      summary.push(`${c.label}: skipped, no active template`)
      continue
    }
    const records = await getSourceRecords(c.key, { since: r.detectFrom })
    const existing = new Set(
      (await db.select({ sourceId: socialPosts.sourceId }).from(socialPosts).where(eq(socialPosts.category, c.key))).map((p) => p.sourceId),
    )
    const fresh = records.filter((rec) => !existing.has(rec.sourceId)).slice(0, automation.maxPerCategory)
    for (const rec of fresh) {
      try {
        await generateDraft(c.key, rec, actorId)
        created++
      } catch (error) {
        summary.push(`${c.label} – ${rec.title}: ${error instanceof Error ? error.message : "failed"}`)
      }
    }
    if (fresh.length) summary.push(`${c.label}: ${fresh.length} new record(s)`)
  }

  await saveAutomation({ ...automation, lastRunAt: new Date().toISOString(), lastRunSummary: summary.join("; ") || "No new records" })
  return { created, summary }
}

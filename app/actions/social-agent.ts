"use server"

import { and, eq, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { socialAccounts, socialCategorySettings, socialPosts, socialTemplates } from "@/lib/db/schema"
import { logActivity, requireSuperAdmin } from "@/lib/rbac"
import { uploadPageImage } from "@/lib/spaces"
import { CATEGORY_KEYS, PLATFORM_KEYS, getCategory, type CategoryKey, type PlatformKey } from "@/lib/social-agent/config"
import { CONNECTIONS } from "@/lib/social-agent/connections"
import { connectedPlatforms, disconnect, publishPost, saveCredentials, selectDestination, testConnection } from "@/lib/social-agent/publishing"
import { imageSize, renderBanner } from "@/lib/social-agent/render"
import { generateCaptions } from "@/lib/social-agent/captions"
import { generateDraft, getAllRules, getAutomation, rerenderPost, runAutomationScan, saveAutomation } from "@/lib/social-agent/service"
import { getSourceRecord } from "@/lib/social-agent/sources"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }
const PATH = "/admin/social-agent"
const MAX_TEMPLATE_BYTES = 8 * 1024 * 1024

async function guarded<T extends object>(fn: (actor: Awaited<ReturnType<typeof requireSuperAdmin>>) => Promise<T>): Promise<Result<T>> {
  try {
    const actor = await requireSuperAdmin()
    const value = await fn(actor)
    revalidatePath(PATH)
    return { ok: true, ...value }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." }
  }
}

const log = (actor: Awaited<ReturnType<typeof requireSuperAdmin>>, action: string, target: string, id?: number | string) =>
  logActivity(actor, action, { entityType: "social_agent", entityId: id, target })

const categorySchema = z.enum(CATEGORY_KEYS as [CategoryKey, ...CategoryKey[]])
const adjustSchema = z.object({
  fit: z.enum(["auto", "preserve", "fill"]),
  zoom: z.number().min(1).max(3),
  x: z.number().min(-1).max(1),
  y: z.number().min(-1).max(1),
})
const platformsSchema = z.array(z.enum(PLATFORM_KEYS as [string, ...string[]])).max(PLATFORM_KEYS.length)

async function readTemplateFile(formData: FormData) {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a PNG or JPG banner to upload.")
  if (file.size > MAX_TEMPLATE_BYTES) throw new Error("Banner must be 8 MB or smaller.")
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Upload a PNG, JPG or WebP banner.")
  const bytes = Buffer.from(await file.arrayBuffer())
  const { width, height } = await imageSize(bytes)
  if (width < 300 || height < 300) throw new Error("Banner must be at least 300×300 pixels.")
  if (width > 4096 || height > 4096) throw new Error("Banner must be 4096 pixels or smaller on each side.")
  const imageUrl = await uploadPageImage({ bytes: new Uint8Array(bytes), contentType: file.type, folder: "social-agent" })
  return { imageUrl, width, height }
}

// --- Templates ----------------------------------------------------------------

export async function uploadTemplate(formData: FormData) {
  return guarded(async (actor) => {
    const category = categorySchema.parse(formData.get("category"))
    const name = z.string().trim().min(1, "Give the template a name.").max(80).parse(formData.get("name"))
    const image = await readTemplateFile(formData)
    const hasActive = await db
      .select({ id: socialTemplates.id })
      .from(socialTemplates)
      .where(and(eq(socialTemplates.category, category), eq(socialTemplates.active, true)))
      .limit(1)
    const [row] = await db
      .insert(socialTemplates)
      .values({ category, name, ...image, active: hasActive.length === 0, createdBy: actor.id })
      .returning({ id: socialTemplates.id })
    await log(actor, "social.template.upload", name, row.id)
    return { id: row.id }
  })
}

export async function replaceTemplateImage(formData: FormData) {
  return guarded(async (actor) => {
    const id = z.coerce.number().int().positive().parse(formData.get("id"))
    const image = await readTemplateFile(formData)
    // Layer positions are stored as fractions, so they carry over to the replacement design.
    await db.update(socialTemplates).set({ ...image, updatedAt: new Date() }).where(eq(socialTemplates.id, id))
    await log(actor, "social.template.replace", `Template #${id}`, id)
    return {}
  })
}

const layerSchema = z.object({
  id: z.string().min(1).max(40),
  field: z.string().min(1).max(40),
  kind: z.enum(["text", "image"]),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.01).max(1),
  h: z.number().min(0.01).max(1),
  fontSize: z.number().min(6).max(400),
  weight: z.enum(["normal", "bold"]),
  color: z.string().regex(/^#[0-9a-f]{3,8}$/i),
  align: z.enum(["left", "center", "right"]),
  maxLines: z.number().int().min(0).max(20),
  maxChars: z.number().int().min(0).max(2000),
  uppercase: z.boolean(),
  fit: z.enum(["cover", "contain", "preserve"]),
  shape: z.enum(["rect", "circle"]),
})

export async function saveTemplateLayout(input: { id: number; name: string; layers: unknown }) {
  return guarded(async (actor) => {
    const id = z.number().int().positive().parse(input.id)
    const name = z.string().trim().min(1).max(80).parse(input.name)
    const layers = z.array(layerSchema).max(30).parse(input.layers)
    const [tpl] = await db.select().from(socialTemplates).where(eq(socialTemplates.id, id)).limit(1)
    if (!tpl) throw new Error("Template not found.")
    const allowed = new Set<string>(getCategory(tpl.category)?.fields.map((f) => f.key) ?? [])
    const bad = layers.find((l) => !allowed.has(l.field))
    if (bad) throw new Error(`"${bad.field}" is not a field of this category.`)
    await db.update(socialTemplates).set({ name, layers, updatedAt: new Date() }).where(eq(socialTemplates.id, id))
    await log(actor, "social.template.layout", name, id)
    return {}
  })
}

export async function activateTemplate(id: number) {
  return guarded(async (actor) => {
    const [tpl] = await db.select().from(socialTemplates).where(eq(socialTemplates.id, id)).limit(1)
    if (!tpl) throw new Error("Template not found.")
    if (tpl.layers.length === 0) throw new Error("Define at least one content area before activating this template.")
    await db.transaction(async (tx) => {
      await tx.update(socialTemplates).set({ active: false }).where(and(eq(socialTemplates.category, tpl.category), ne(socialTemplates.id, id)))
      await tx.update(socialTemplates).set({ active: true, updatedAt: new Date() }).where(eq(socialTemplates.id, id))
    })
    await log(actor, "social.template.activate", tpl.name, id)
    return {}
  })
}

export async function deleteTemplate(id: number) {
  return guarded(async (actor) => {
    const [tpl] = await db.delete(socialTemplates).where(eq(socialTemplates.id, id)).returning({ name: socialTemplates.name })
    if (tpl) await log(actor, "social.template.delete", tpl.name, id)
    return {}
  })
}

/** Renders a template with a real record (or sample values) without saving anything. */
export async function previewTemplate(input: { id: number; layers?: unknown; sourceId?: string }) {
  return guarded(async () => {
    const [tpl] = await db.select().from(socialTemplates).where(eq(socialTemplates.id, input.id)).limit(1)
    if (!tpl) throw new Error("Template not found.")
    const layers = input.layers ? z.array(layerSchema).max(30).parse(input.layers) : tpl.layers
    const cat = getCategory(tpl.category)!
    let fields: Record<string, string> = Object.fromEntries(cat.fields.map((f) => [f.key, f.sample]))
    if (input.sourceId) {
      const record = await getSourceRecord(tpl.category as CategoryKey, input.sourceId)
      if (!record) throw new Error("Record not found or not approved.")
      fields = record.fields
    }
    // Sample image fields stay empty, so show a neutral placeholder instead of flagging them as missing.
    const sampleLayers = input.sourceId ? layers : layers.filter((l) => l.kind === "text" || fields[l.field])
    const { banner, issues } = await renderBanner({ ...tpl, layers: sampleLayers }, fields)
    return { dataUrl: `data:image/png;base64,${banner.toString("base64")}`, issues }
  })
}

// --- Categories & automation -------------------------------------------------

export async function saveCategoryRules(input: {
  category: string
  enabled: boolean
  autoGenerate: boolean
  captionRules: string
  hashtags: string
  platforms: string[]
}) {
  return guarded(async (actor) => {
    const category = categorySchema.parse(input.category)
    const values = {
      enabled: z.boolean().parse(input.enabled),
      autoGenerate: z.boolean().parse(input.autoGenerate),
      captionRules: z.string().max(1500).parse(input.captionRules),
      hashtags: z.string().max(300).parse(input.hashtags),
      platforms: platformsSchema.parse(input.platforms),
    }
    const current = (await getAllRules())[category]
    // Turning automation on starts detection from now, so the existing backlog is not posted automatically.
    const detectFrom = values.autoGenerate ? (current.autoGenerate && current.detectFrom ? current.detectFrom : new Date()) : null
    await db
      .insert(socialCategorySettings)
      .values({ category, ...values, detectFrom })
      .onConflictDoUpdate({ target: socialCategorySettings.category, set: { ...values, detectFrom, updatedAt: new Date() } })
    await log(actor, "social.category.update", getCategory(category)!.label)
    return {}
  })
}

export async function saveAutomationSettings(input: { enabled: boolean; maxPerCategory: number }) {
  return guarded(async (actor) => {
    const current = await getAutomation()
    await saveAutomation({
      ...current,
      enabled: z.boolean().parse(input.enabled),
      maxPerCategory: z.number().int().min(1).max(10).parse(input.maxPerCategory),
    })
    await log(actor, "social.automation.update", input.enabled ? "Automation on" : "Automation off")
    return {}
  })
}

export async function scanNow() {
  return guarded(async (actor) => {
    const result = await runAutomationScan(actor.id)
    await log(actor, "social.automation.scan", `${result.created} draft(s) created`)
    return result
  })
}

// --- Posts -------------------------------------------------------------------

export async function generatePost(input: { category: string; sourceId: string }) {
  return guarded(async (actor) => {
    const category = categorySchema.parse(input.category)
    const record = await getSourceRecord(category, z.string().max(40).parse(input.sourceId))
    if (!record) throw new Error("That record is not approved or no longer exists.")
    const result = await generateDraft(category, record, actor.id)
    await log(actor, "social.post.generate", record.title, result.id)
    return result
  })
}

async function loadPost(id: number) {
  const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, id)).limit(1)
  if (!post) throw new Error("Post not found.")
  return post
}

export async function updatePost(input: {
  id: number
  fields: Record<string, string>
  captions: Record<string, string>
  platforms: string[]
  videoUrl: string
  imageAdjust?: Record<string, unknown>
}) {
  return guarded(async (actor) => {
    const post = await loadPost(input.id)
    if (post.status === "published" || post.status === "publishing") throw new Error("Published posts cannot be edited.")
    const imageKeys = getCategory(post.category)?.fields.filter((f) => f.kind === "image").map((f) => f.key) ?? []
    const imageAdjust = Object.fromEntries(
      imageKeys.filter((k) => input.imageAdjust?.[k]).map((k) => [k, adjustSchema.parse(input.imageAdjust?.[k])]),
    )
    const allowed = getCategory(post.category)?.fields.map((f) => f.key) ?? []
    const fields = Object.fromEntries(
      allowed.map((k) => [k, z.string().max(2000).parse(input.fields[k] ?? "")]),
    ) as Record<string, string>
    const platforms = platformsSchema.parse(input.platforms)
    const captions = Object.fromEntries(platforms.map((p) => [p, z.string().max(5000).parse(input.captions[p] ?? "")]))
    const videoUrl = z.union([z.literal(""), z.string().url().max(500)]).parse(input.videoUrl.trim())

    await db.update(socialPosts).set({ captions, platforms, videoUrl, updatedAt: new Date() }).where(eq(socialPosts.id, post.id))
    let issues = post.issues
    if (
      JSON.stringify(fields) !== JSON.stringify(post.fields) ||
      JSON.stringify(imageAdjust) !== JSON.stringify(post.imageAdjust) ||
      platforms.some((p) => !post.variants[p])
    ) {
      issues = (await rerenderPost(post.id, fields, imageAdjust)).issues
    }
    await log(actor, "social.post.edit", post.sourceTitle, post.id)
    return { issues }
  })
}

export async function regenerateCaptions(id: number) {
  return guarded(async (actor) => {
    const post = await loadPost(id)
    const rules = (await getAllRules())[post.category as CategoryKey]
    const { captions, error } = await generateCaptions({ category: post.category, fields: post.fields, url: post.sourceUrl, platforms: post.platforms, rules })
    if (error) throw new Error(error)
    const issues = post.issues.filter((i) => !i.startsWith("Captions were not generated"))
    await db
      .update(socialPosts)
      .set({ captions, issues, status: post.status === "needs_review" && issues.length === 0 ? "pending_approval" : post.status, updatedAt: new Date() })
      .where(eq(socialPosts.id, id))
    await log(actor, "social.post.captions", post.sourceTitle, id)
    return {}
  })
}

export async function approvePost(input: { id: number; scheduledAt?: string | null }) {
  return guarded(async (actor) => {
    const post = await loadPost(input.id)
    if (post.issues.length) throw new Error("Resolve the flagged issues before approving. Edit the fields and save to re-render.")
    if (!["pending_approval", "approved", "scheduled"].includes(post.status)) throw new Error("This post cannot be approved in its current state.")
    if (post.platforms.some((p) => !post.captions[p]?.trim())) throw new Error("Every selected platform needs a caption.")
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid schedule date.")
    await db
      .update(socialPosts)
      .set({ status: scheduledAt ? "scheduled" : "approved", scheduledAt, reviewedBy: actor.id, updatedAt: new Date() })
      .where(eq(socialPosts.id, post.id))
    await log(actor, scheduledAt ? "social.post.schedule" : "social.post.approve", post.sourceTitle, post.id)
    // Immediate approval publishes straight away to every connected platform; scheduled posts wait for the cron.
    if (scheduledAt) return { publish: null }
    const connected = await connectedPlatforms()
    if (!post.platforms.some((p) => connected.includes(p))) return { publish: null }
    const publish = await publishPost(post.id)
    await log(actor, "social.post.autopublish", post.sourceTitle, post.id)
    return { publish }
  })
}

export async function publishNow(id: number) {
  return guarded(async (actor) => {
    const post = await loadPost(id)
    const publish = await publishPost(id)
    await log(actor, "social.post.autopublish", post.sourceTitle, id)
    return { publish }
  })
}

export async function rejectPost(input: { id: number; note: string }) {
  return guarded(async (actor) => {
    const post = await loadPost(input.id)
    if (post.status === "published") throw new Error("Published posts cannot be rejected.")
    await db
      .update(socialPosts)
      .set({ status: "rejected", reviewNote: z.string().max(500).parse(input.note), reviewedBy: actor.id, updatedAt: new Date() })
      .where(eq(socialPosts.id, post.id))
    await log(actor, "social.post.reject", post.sourceTitle, post.id)
    return {}
  })
}

export async function markPublished(input: { id: number; links: Record<string, string> }) {
  return guarded(async (actor) => {
    const post = await loadPost(input.id)
    if (post.status !== "approved" && post.status !== "scheduled") throw new Error("Only approved posts can be marked as published.")
    const links = Object.fromEntries([
      ...Object.entries(post.publishedLinks),
      ...post.platforms
        .map((p) => [p, (input.links[p] ?? "").trim()] as const)
        .filter(([, v]) => v)
        .map(([p, v]) => [p, z.string().url().max(500).parse(v)]),
    ])
    await db.update(socialPosts).set({ status: "published", publishedAt: new Date(), publishedLinks: links, updatedAt: new Date() }).where(eq(socialPosts.id, post.id))
    await log(actor, "social.post.publish", post.sourceTitle, post.id)
    return {}
  })
}

export async function deletePost(id: number) {
  return guarded(async (actor) => {
    const [post] = await db.delete(socialPosts).where(eq(socialPosts.id, id)).returning({ title: socialPosts.sourceTitle })
    if (post) await log(actor, "social.post.delete", post.title, id)
    return {}
  })
}

// --- Accounts ----------------------------------------------------------------

export async function saveAccount(input: { platform: string; handle: string; profileUrl: string; notes: string }) {
  return guarded(async (actor) => {
    const platform = z.enum(PLATFORM_KEYS as [string, ...string[]]).parse(input.platform)
    const values = {
      handle: z.string().trim().max(100).parse(input.handle),
      profileUrl: z.union([z.literal(""), z.string().url().max(300)]).parse(input.profileUrl.trim()),
      notes: z.string().max(500).parse(input.notes),
      updatedBy: actor.id,
    }
    await db
      .insert(socialAccounts)
      .values({ platform, ...values })
      .onConflictDoUpdate({ target: socialAccounts.platform, set: { ...values, updatedAt: new Date() } })
    await log(actor, "social.account.update", platform)
    return {}
  })
}

// --- API connections (credentials never leave the server) ---------------------

const platformKeySchema = z.enum(PLATFORM_KEYS as [PlatformKey, ...PlatformKey[]])

export async function saveConnection(input: { platform: string; values: Record<string, string> }) {
  return guarded(async (actor) => {
    const platform = platformKeySchema.parse(input.platform)
    const allowed = CONNECTIONS[platform].fields.map((f) => f.key)
    const values = Object.fromEntries(allowed.map((k) => [k, z.string().max(4000).parse(input.values[k] ?? "")]))
    await saveCredentials(platform, values, actor.id)
    const test = await testConnection(platform)
    await log(actor, "social.connection.save", platform)
    if (!test.ok) throw new Error(`Saved, but the connection test failed: ${test.error}`)
    return { accountName: test.accountName }
  })
}

export async function testPlatformConnection(platform: string) {
  return guarded(async (actor) => {
    const key = platformKeySchema.parse(platform)
    const test = await testConnection(key)
    await log(actor, "social.connection.test", key)
    if (!test.ok) throw new Error(test.error)
    return { accountName: test.accountName }
  })
}

export async function selectConnectionDestination(input: { platform: string; destinationId: string }) {
  return guarded(async (actor) => {
    const key = platformKeySchema.parse(input.platform)
    const destinationId = z.string().min(1).max(200).parse(input.destinationId)
    const test = await selectDestination(key, destinationId, actor.id)
    await log(actor, "social.connection.select", key)
    if (!test.ok) throw new Error(`Account selected, but the connection test failed: ${test.error}`)
    return { accountName: test.accountName }
  })
}

export async function disconnectPlatform(platform: string) {
  return guarded(async (actor) => {
    const key = platformKeySchema.parse(platform)
    await disconnect(key)
    await log(actor, "social.connection.remove", key)
    return {}
  })
}

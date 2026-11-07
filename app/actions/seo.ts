"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { seoEntries, settings } from "@/lib/db/schema"
import { getSession, isAdmin, isStaff } from "@/lib/session"
import { SEO_SETTINGS_KEY, normalizeSiteUrl } from "@/lib/seo/config"
import { DEFAULT_SEO_GLOBALS, type SeoGlobals } from "@/lib/seo/shared"

type Result = { ok: true } | { ok: false; error: string }

const KEY_PATTERN = /^(page|cms|news|article|event|team|kol):[^\s]{1,300}$/

const TEXT_LIMITS = {
  seoTitle: 200,
  metaDescription: 500,
  keywords: 500,
  canonicalUrl: 1000,
  ogTitle: 200,
  ogDescription: 500,
  ogImage: 2000,
  twitterTitle: 200,
  twitterDescription: 500,
  twitterImage: 2000,
  customSchema: 20000,
} as const

type TextField = keyof typeof TEXT_LIMITS

export type SeoEntryInput = Record<TextField, string> & {
  noindex: boolean
  published: boolean
  extra: Record<string, string>
}

const EXTRA_KEYS = [
  "endDate",
  "timezone",
  "eventStatus",
  "venueName",
  "streetAddress",
  "registrationUrl",
  "price",
  "currency",
  "availability",
]

function isUrlOrPath(value: string) {
  return !value || value.startsWith("/") || /^https:\/\//i.test(value)
}

async function requireSeoEditor() {
  const session = await getSession()
  if (!session?.user || !isStaff(session.user.role)) return null
  return session.user
}

export async function saveSeoEntry(key: string, input: SeoEntryInput): Promise<Result> {
  const user = await requireSeoEditor()
  if (!user) return { ok: false, error: "You do not have permission to edit SEO." }
  if (!KEY_PATTERN.test(key)) return { ok: false, error: "Invalid page key." }

  const values = {} as Record<TextField, string>
  for (const field of Object.keys(TEXT_LIMITS) as TextField[]) {
    const v = String(input[field] ?? "").trim()
    if (v.length > TEXT_LIMITS[field]) return { ok: false, error: `${field} is too long.` }
    values[field] = v
  }
  for (const field of ["canonicalUrl", "ogImage", "twitterImage"] as const) {
    if (values[field].startsWith("data:")) return { ok: false, error: "Upload images so they get a public URL — inline images cannot be shared." }
    if (!isUrlOrPath(values[field])) return { ok: false, error: `${field} must be an https:// URL or a site path.` }
  }
  if (values.customSchema) {
    try {
      const parsed = JSON.parse(values.customSchema)
      if (!parsed || typeof parsed !== "object") throw new Error("Schema must be a JSON object or array.")
    } catch (err) {
      return { ok: false, error: `Custom schema is not valid JSON: ${err instanceof Error ? err.message : "parse error"}` }
    }
  }
  const extra: Record<string, string> = {}
  for (const k of EXTRA_KEYS) {
    const v = String(input.extra?.[k] ?? "").trim().slice(0, 500)
    if (v) extra[k] = v
  }
  if (extra.registrationUrl && !/^https:\/\//i.test(extra.registrationUrl))
    return { ok: false, error: "Registration URL must start with https://" }

  const row = {
    ...values,
    noindex: Boolean(input.noindex),
    published: Boolean(input.published),
    extra,
    updatedBy: user.id,
    updatedAt: new Date(),
  }
  await db
    .insert(seoEntries)
    .values({ key, ...row })
    .onConflictDoUpdate({ target: seoEntries.key, set: row })

  revalidatePath("/", "layout")
  return { ok: true }
}

export async function resetSeoEntry(key: string): Promise<Result> {
  const user = await requireSeoEditor()
  if (!user) return { ok: false, error: "You do not have permission to edit SEO." }
  await db.delete(seoEntries).where(eq(seoEntries.key, key))
  revalidatePath("/", "layout")
  return { ok: true }
}

export async function saveSeoGlobals(input: SeoGlobals): Promise<Result> {
  const session = await getSession()
  if (!session?.user || !isAdmin(session.user.role)) return { ok: false, error: "Only super admins can change global SEO." }

  const next: SeoGlobals = { ...DEFAULT_SEO_GLOBALS }
  for (const k of Object.keys(DEFAULT_SEO_GLOBALS) as (keyof SeoGlobals)[]) {
    const v = input[k]
    if (typeof DEFAULT_SEO_GLOBALS[k] === "boolean") (next as Record<string, unknown>)[k] = Boolean(v)
    else (next as Record<string, unknown>)[k] = String(v ?? "").trim().slice(0, 1000)
  }
  next.siteUrl = normalizeSiteUrl(next.siteUrl)
  if (!next.siteUrl.startsWith("https://")) return { ok: false, error: "Site URL must use https://" }
  for (const k of ["defaultOgImage", "logo"] as const) {
    if (next[k].startsWith("data:") || !isUrlOrPath(next[k]))
      return { ok: false, error: `${k} must be an https:// URL or a site path.` }
  }

  const value = JSON.stringify(next)
  await db
    .insert(settings)
    .values({ key: SEO_SETTINGS_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  revalidatePath("/", "layout")
  return { ok: true }
}

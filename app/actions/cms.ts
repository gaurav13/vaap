"use server"

import { db } from "@/lib/db"
import {
  publications,
  documents,
  leadership,
  committees,
  partners,
  officialStatus,
  pages,
  members,
  membershipPlans,
  membershipFaqs,
  auditLogs,
} from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { desc, eq, and, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { ENTITIES, type EntityKey, type FieldDef } from "@/lib/cms/entities"

const TABLES = {
  publications,
  documents,
  leadership,
  committees,
  partners,
  officialStatus,
  pages,
  members,
  membershipPlans,
  membershipFaqs,
} as const

async function requireStaff() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  const role = session.user.role
  if (role !== "staff" && role !== "admin") throw new Error("Forbidden")
  return session.user
}

async function log(actor: { id: string; name?: string | null }, action: string, target: string) {
  try {
    await db.insert(auditLogs).values({ actorId: actor.id, actorName: actor.name ?? "", action, target })
  } catch {
    // audit failures must never block the primary write
  }
}

function parseField(field: FieldDef, formData: FormData) {
  if (field.type === "checkbox") return formData.get(field.name) === "on"
  if (field.type === "number") {
    const n = Number.parseInt(String(formData.get(field.name) ?? ""), 10)
    return Number.isNaN(n) ? 0 : n
  }
  if (field.type === "datetime") {
    const raw = String(formData.get(field.name) ?? "").trim()
    return raw ? new Date(raw) : new Date()
  }
  const raw = String(formData.get(field.name) ?? "").trim()
  if (!raw && field.nullable) return null
  return raw
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export async function saveEntity(key: EntityKey, id: number | null, formData: FormData) {
  const actor = await requireStaff()
  const config = ENTITIES[key]
  const table = TABLES[key] as any

  const values: Record<string, unknown> = {}
  for (const field of config.fields) {
    values[field.name] = parseField(field, formData)
  }

  // Entity-specific normalization.
  if (key === "pages") {
    values.slug = slugify(String(values.slug || values.title || ""))
    values.parentSlug = values.parentSlug ? slugify(String(values.parentSlug)) : null
    values.updatedAt = new Date()
    const slug = String(values.slug)
    const parent = (values.parentSlug as string | null) ?? null
    const matches = await db.select({ id: pages.id, parentSlug: pages.parentSlug }).from(pages).where(eq(pages.slug, slug))
    const clash = matches.find((row) => row.id !== id && (row.parentSlug ?? null) === parent)
    if (clash) return { ok: false, error: "A page with this slug already exists in that section." }
  }
  if (key === "members") {
    if (!values.membershipId) {
      values.membershipId = `VAAP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    }
  }

  // Required validation.
  for (const field of config.fields) {
    if (field.required && !values[field.name]) {
      return { ok: false, error: `${field.label} is required.` }
    }
  }

  try {
    if (id) {
      await db.update(table).set(values).where(eq(table.id, id))
      await log(actor, `updated ${config.singular}`, String(values[config.list.title] ?? id))
    } else {
      await db.insert(table).values(values)
      await log(actor, `created ${config.singular}`, String(values[config.list.title] ?? ""))
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed."
    return { ok: false, error: message }
  }

  for (const path of config.revalidate) revalidatePath(path)
  revalidatePath(`/admin/${adminSlug(key)}`)
  return { ok: true }
}

export async function deleteEntity(key: EntityKey, id: number) {
  const actor = await requireStaff()
  const config = ENTITIES[key]
  const table = TABLES[key] as any
  await db.delete(table).where(eq(table.id, id))
  await log(actor, `deleted ${config.singular}`, String(id))
  for (const path of config.revalidate) revalidatePath(path)
  revalidatePath(`/admin/${adminSlug(key)}`)
  return { ok: true }
}

function adminSlug(key: EntityKey) {
  if (key === "officialStatus") return "official-status"
  if (key === "membershipPlans") return "membership-plans"
  if (key === "membershipFaqs") return "membership-faqs"
  return key
}

// --- Public read helpers ---------------------------------------------------

export async function getPublications(opts?: { includeMembersOnly?: boolean }) {
  const rows = await db.select().from(publications).where(eq(publications.published, true)).orderBy(desc(publications.createdAt))
  if (opts?.includeMembersOnly) return rows
  return rows.filter((r) => !r.membersOnly)
}

export async function getDocuments() {
  return db.select().from(documents).where(eq(documents.published, true)).orderBy(desc(documents.createdAt))
}

export async function getLeadership(kind?: "committee" | "message") {
  const where = kind
    ? and(eq(leadership.published, true), eq(leadership.kind, kind))
    : eq(leadership.published, true)
  return db.select().from(leadership).where(where).orderBy(leadership.sortOrder)
}

export async function getCommittees() {
  return db.select().from(committees).where(eq(committees.published, true)).orderBy(committees.sortOrder)
}

export async function getPartners() {
  return db.select().from(partners).where(eq(partners.published, true)).orderBy(partners.sortOrder)
}

export async function getOfficialStatus() {
  return db.select().from(officialStatus).where(eq(officialStatus.published, true)).orderBy(officialStatus.sortOrder)
}

export async function getMembershipPlans() {
  return db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.published, true))
    .orderBy(membershipPlans.sortOrder)
}

export async function getMembershipFaqs() {
  return db
    .select()
    .from(membershipFaqs)
    .where(eq(membershipFaqs.published, true))
    .orderBy(membershipFaqs.sortOrder)
}

export async function getMembersDirectory() {
  return db
    .select()
    .from(members)
    .where(and(eq(members.status, "active"), isNull(members.deletedAt)))
    .orderBy(desc(members.joinedAt))
}

export async function getMyMembership(userId: string) {
  const rows = await db.select().from(members).where(eq(members.userId, userId)).limit(1)
  return rows[0] ?? null
}

// Shared lookup used by both the verify form (POST) and the QR deep-link
// (GET ?id=). Only ever exposes non-sensitive, publicly verifiable fields.
export async function lookupMembership(query: string) {
  const q = String(query ?? "").trim()
  if (!q) return { status: "idle" as const }

  const rows = await db.select().from(members).where(isNull(members.deletedAt)).limit(500)

  // Normalize by stripping everything except alphanumerics so a membership ID
  // matches whether the user types "VAAP-2026-000008", "2026-000008", "2026 000008",
  // or just the numeric portion. Email is matched exactly.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  const nq = norm(q)

  let match = rows.find(
    (m) => norm(m.membershipId) === nq || m.email.toLowerCase() === q.toLowerCase(),
  )

  // Fall back to a suffix match (e.g. "2026-000008" against "VAAP-2026-000008"),
  // but only when it is unambiguous (a single member matches).
  if (!match && nq.length >= 4) {
    const suffixMatches = rows.filter((m) => norm(m.membershipId).endsWith(nq))
    if (suffixMatches.length === 1) {
      match = suffixMatches[0]
    }
  }

  if (!match || match.status !== "active") {
    return { status: "not_found" as const, query: q }
  }

  return {
    status: "found" as const,
    member: {
      membershipId: match.membershipId,
      name: match.name,
      organization: match.organization,
      category: match.category,
      goodStanding: match.goodStanding,
      votingEligible: match.votingEligible,
      joinedAt: match.joinedAt.toISOString(),
    },
  }
}

export async function verifyMembership(_prev: unknown, formData: FormData) {
  return lookupMembership(String(formData.get("query") ?? ""))
}

// Creates (or re-links) a published CMS page from a menu label so the menu
// href and the page's slug/parentSlug always line up. For a sub-item, pass the
// parent menu item's href so the new page nests under it (e.g. a "Committees"
// sub-item under "/governance" becomes the page /governance/committees).
export async function createPageForMenu(label: string, parentPath?: string | null) {
  const actor = await requireStaff()
  const title = String(label ?? "").trim()
  if (!title) return { ok: false as const, error: "Enter a label first, then create its page." }

  const slug = slugify(title)
  if (!slug) return { ok: false as const, error: "The label must contain letters or numbers." }

  let parentSlug: string | null = null
  if (parentPath) {
    const parts = String(parentPath)
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean)
    parentSlug = parts.length ? parts[parts.length - 1] : null
  }

  const href = `/${parentSlug ? `${parentSlug}/` : ""}${slug}`

  const existing = await db.select().from(pages).where(eq(pages.slug, slug))
  const match = existing.find((p) => (p.parentSlug ?? null) === (parentSlug ?? null))

  if (match) {
    if (match.status !== "published") {
      await db.update(pages).set({ status: "published", updatedAt: new Date() }).where(eq(pages.id, match.id))
    }
    revalidatePath("/", "layout")
    revalidatePath("/admin/pages")
    revalidatePath("/admin/sitemap")
    return { ok: true as const, href, title: match.title, created: false }
  }

  await db.insert(pages).values({
    title,
    slug,
    parentSlug,
    status: "published",
    heroTitle: title,
    heroSubtitle: "",
    content: "",
    seoTitle: "",
    metaDescription: "",
  })
  await log(actor, "created Page (via menu)", title)
  revalidatePath("/", "layout")
  revalidatePath("/admin/pages")
  revalidatePath("/admin/settings")
  revalidatePath("/admin/sitemap")
  return { ok: true as const, href, title, created: true }
}

// Deletes the CMS page whose clean URL matches the given href. Used when an
// admin removes a menu item and chooses to also delete its linked page.
export async function deletePageByHref(href: string) {
  const actor = await requireStaff()
  const parts = String(href || "")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
  if (parts.length === 0) return { ok: false as const, error: "No page URL to delete." }

  const slug = parts[parts.length - 1]
  const parentSlug = parts.length > 1 ? parts[parts.length - 2] : null

  const matches = await db.select().from(pages).where(eq(pages.slug, slug))
  const target = matches.find((p) => (p.parentSlug ?? null) === (parentSlug ?? null))
  if (!target) return { ok: false as const, error: "No matching page found." }

  await db.delete(pages).where(eq(pages.id, target.id))
  await log(actor, "deleted Page (via menu)", target.title)
  revalidatePath("/", "layout")
  revalidatePath("/admin/pages")
  revalidatePath("/admin/settings")
  revalidatePath("/admin/sitemap")
  return { ok: true as const, title: target.title }
}

export async function getAllPages() {
  await requireStaff()
  return db.select().from(pages).orderBy(desc(pages.updatedAt))
}

export async function getPublishedPage(slug: string, parentSlug?: string | null) {
  return getCmsPage(slug, parentSlug, { includeDrafts: false })
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

// Public visitors only receive published pages. Staff and super admins can
// preview drafts at the same URL.
export async function getCmsPage(slug: string, parentSlug?: string | null, opts?: { includeDrafts?: boolean }) {
  const rows = await db.select().from(pages).where(eq(pages.slug, slug)).limit(10)
  const parent = parentSlug === undefined ? undefined : blankToNull(parentSlug)
  const matched = rows.filter((row) => parent === undefined || blankToNull(row.parentSlug) === parent)
  const visible = opts?.includeDrafts ? matched : matched.filter((row) => row.status === "published")
  return visible[0] ?? null
}

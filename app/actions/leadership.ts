"use server"

import { and, desc, eq, inArray, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auditLogs, leadership, leadershipRevisions } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { sanitizeRichText } from "@/lib/sanitize"
import { generateProfileSections } from "@/lib/leadership-ai"
import {
  AI_SECTIONS,
  APPLICATION_KINDS,
  LEADERSHIP_SECTIONS,
  PROFILE_FIELDS,
  leaderPath,
  slugifyName,
  type AiSection,
  type ProfileContent,
} from "@/lib/leadership"

type Leader = typeof leadership.$inferSelect
type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

const MAX_LENGTH: Partial<Record<keyof ProfileContent, number>> = {
  name: 120,
  position: 120,
  title: 160,
  organization: 160,
  responsibility: 600,
  portfolio: 600,
  summary: 600,
  bio: 12000,
  message: 3000,
}
const URL_FIELDS = new Set(["photo", "linkedin", "x", "facebook", "instagram", "website"])
const ALL_KINDS = new Set<string>(LEADERSHIP_SECTIONS.flatMap((s) => [...s.kinds]))

async function requireEditor() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin" && session.user.role !== "manager") throw new Error("Forbidden")
  return session.user
}

function isSafeUrl(value: string) {
  if (!value) return true
  if (value.startsWith("/")) return !value.startsWith("//")
  try {
    const u = new URL(value)
    return u.protocol === "https:" || u.protocol === "http:"
  } catch {
    return false
  }
}

function cleanContent(input: Partial<Record<string, unknown>>): { content: ProfileContent } | { error: string } {
  const content = {} as ProfileContent
  for (const field of PROFILE_FIELDS) {
    let value = String(input[field] ?? "").trim()
    const max = MAX_LENGTH[field] ?? 2048
    if (value.length > max) return { error: `${field} is too long (max ${max} characters).` }
    if (URL_FIELDS.has(field) && !isSafeUrl(value)) return { error: `${field} must be a valid http(s) link.` }
    if (field === "bio") value = sanitizeRichText(value)
    if (field === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { error: "Public email is invalid." }
    content[field] = value
  }
  if (!content.name) return { error: "Full name is required." }
  if (!ALL_KINDS.has(content.kind)) return { error: "Choose a leadership group." }
  return { content }
}

function liveContent(row: Leader): ProfileContent {
  const out = {} as ProfileContent
  for (const field of PROFILE_FIELDS) out[field] = String((row as Record<string, unknown>)[field] ?? "")
  return out
}

async function uniqueSlug(name: string, excludeId?: number) {
  const base = slugifyName(name)
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`
    const [hit] = await db
      .select({ id: leadership.id })
      .from(leadership)
      .where(excludeId ? and(eq(leadership.slug, candidate), ne(leadership.id, excludeId)) : eq(leadership.slug, candidate))
      .limit(1)
    if (!hit) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

async function record(leadershipId: number, actor: { id: string; name?: string | null }, action: string, snapshot: unknown, note = "") {
  try {
    await db.insert(leadershipRevisions).values({
      leadershipId,
      action,
      actorId: actor.id,
      actorName: actor.name ?? "",
      note: note.slice(0, 1000),
      snapshot: snapshot as Record<string, unknown>,
    })
    await db.insert(auditLogs).values({ actorId: actor.id, actorName: actor.name ?? "", action: `leadership.${action}`, target: String(leadershipId) })
  } catch (e) {
    console.error("[leadership] revision log failed:", (e as Error).message)
  }
}

function revalidateLeadership(...paths: string[]) {
  for (const p of ["/", "/about", "/team", "/governance", "/admin/leadership", "/sitemap.xml", ...paths]) revalidatePath(p)
}

async function getLeader(id: number) {
  if (!Number.isInteger(id) || id <= 0) return null
  const [row] = await db.select().from(leadership).where(eq(leadership.id, id)).limit(1)
  return row ?? null
}

// --- Applicant --------------------------------------------------------------

export async function getMyLeadershipApplication() {
  const session = await getSession()
  if (!session?.user) return null
  const [row] = await db
    .select({ id: leadership.id, status: leadership.status, kind: leadership.kind, submittedAt: leadership.submittedAt, reviewNote: leadership.reviewNote })
    .from(leadership)
    .where(eq(leadership.applicantUserId, session.user.id))
    .orderBy(desc(leadership.id))
    .limit(1)
  return row ?? null
}

export async function submitLeadershipApplication(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const session = await getSession()
  if (!session?.user) return { ok: false, error: "Please sign in to apply." }
  const user = session.user

  const [open] = await db
    .select({ id: leadership.id })
    .from(leadership)
    .where(and(eq(leadership.applicantUserId, user.id), inArray(leadership.status, ["pending", "in_review"])))
    .limit(1)
  if (open) return { ok: false, error: "You already have an application under review." }

  const kind = String(formData.get("kind") ?? "")
  if (!APPLICATION_KINDS.some((k) => k.value === kind)) return { ok: false, error: "Choose the position you are applying for." }

  const raw = Object.fromEntries(PROFILE_FIELDS.map((f) => [f, formData.get(f) ?? ""]))
  // Applicants provide facts only; the summary is written during review.
  const parsed = cleanContent({ ...raw, kind, summary: "", bio: String(raw.bio ?? "").replace(/</g, "&lt;") })
  if ("error" in parsed) return { ok: false, error: parsed.error }
  const c = parsed.content
  if (!c.title || !c.organization || !c.portfolio || plainLength(c.bio) < 80) {
    return { ok: false, error: "Professional title, organization, portfolio and a biography of at least 80 characters are required." }
  }

  const contactEmail = String(formData.get("contactEmail") ?? user.email ?? "").trim().slice(0, 200)
  const contactPhone = String(formData.get("contactPhone") ?? "").trim().slice(0, 40)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { ok: false, error: "Enter a valid contact email." }
  if (formData.get("consent") !== "on") return { ok: false, error: "Please confirm the information is accurate." }

  const bioHtml = c.bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("")
  const submission: Record<string, string> = { ...c, bio: bioHtml }

  const [row] = await db
    .insert(leadership)
    .values({
      ...submission,
      name: c.name,
      slug: await uniqueSlug(c.name),
      published: false,
      featured: false,
      status: "pending",
      applicantUserId: user.id,
      contactEmail,
      contactPhone,
      submission,
      submittedAt: new Date(),
    })
    .returning({ id: leadership.id })

  await record(row.id, user, "submitted", submission)
  revalidatePath("/admin/leadership")
  return { ok: true, message: "Application received. The VAAP team will review it and contact you." }
}

function plainLength(value: string) {
  return value.replace(/<[^>]+>/g, "").trim().length
}

// --- Admin studio -----------------------------------------------------------

export async function getLeadershipStudio(id: number) {
  await requireEditor()
  const row = await getLeader(id)
  if (!row) return null
  const revisions = await db
    .select({ id: leadershipRevisions.id, action: leadershipRevisions.action, actorName: leadershipRevisions.actorName, note: leadershipRevisions.note, createdAt: leadershipRevisions.createdAt })
    .from(leadershipRevisions)
    .where(eq(leadershipRevisions.leadershipId, id))
    .orderBy(desc(leadershipRevisions.id))
    .limit(40)
  const live = liveContent(row)
  return {
    id: row.id,
    status: row.status,
    published: row.published,
    path: leaderPath(row),
    live,
    draft: row.draft ? ({ ...live, ...row.draft } as ProfileContent) : null,
    submission: row.submission ?? null,
    contactEmail: row.contactEmail ?? "",
    contactPhone: row.contactPhone ?? "",
    reviewNote: row.reviewNote,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    revisions: revisions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  }
}

export async function saveLeadershipDraft(id: number, input: Record<string, string>): Promise<ActionResult> {
  const actor = await requireEditor()
  const row = await getLeader(id)
  if (!row) return { ok: false, error: "Profile not found." }
  const parsed = cleanContent(input)
  if ("error" in parsed) return { ok: false, error: parsed.error }
  await db
    .update(leadership)
    .set({ draft: parsed.content, status: row.status === "pending" || row.status === "rejected" ? "in_review" : row.status, updatedAt: new Date() })
    .where(eq(leadership.id, id))
  await record(id, actor, "draft_saved", parsed.content)
  revalidatePath(`/admin/leadership/${id}`)
  return { ok: true, message: "Draft saved. It is not public until you approve and publish." }
}

export async function generateLeadershipSections(
  id: number,
  sections: AiSection[],
  current: Record<string, string>,
): Promise<{ ok: true; sections: Partial<Record<AiSection, string>> } | { ok: false; error: string }> {
  const actor = await requireEditor()
  const row = await getLeader(id)
  if (!row) return { ok: false, error: "Profile not found." }
  const valid = sections.filter((s) => AI_SECTIONS.some((a) => a.key === s))
  if (valid.length === 0) return { ok: false, error: "Choose a section to generate." }

  // Ground the model in the applicant's original facts, plus the identity
  // fields an editor has confirmed. AI-written sections are never fed back in.
  const source = { ...liveContent(row), ...(row.submission ?? {}) }
  const facts: Record<string, string> = { ...source }
  for (const key of ["name", "kind", "position", "title", "organization", "portfolio"] as const) {
    if (current[key]?.trim()) facts[key] = current[key].trim().slice(0, 600)
  }
  facts.message = row.submission?.message ?? row.message

  const result = await generateProfileSections({ facts, sections: valid, actorId: actor.id })
  if (result.error) return { ok: false, error: result.error }
  await record(id, actor, valid.length > 1 ? "ai_generated" : `ai_regenerated:${valid[0]}`, result.sections)
  return { ok: true, sections: result.sections }
}

export async function publishLeadershipProfile(id: number, input: Record<string, string>): Promise<ActionResult> {
  const actor = await requireEditor()
  const row = await getLeader(id)
  if (!row) return { ok: false, error: "Profile not found." }
  const parsed = cleanContent(input)
  if ("error" in parsed) return { ok: false, error: parsed.error }

  const oldPath = leaderPath(row)
  const slug = row.slug ?? (await uniqueSlug(parsed.content.name, id))
  await db
    .update(leadership)
    .set({
      ...parsed.content,
      slug,
      published: true,
      status: "approved",
      draft: null,
      reviewNote: "",
      reviewedAt: new Date(),
      reviewedBy: actor.id,
      updatedAt: new Date(),
    })
    .where(eq(leadership.id, id))
  await record(id, actor, "published", parsed.content)
  const newPath = leaderPath({ id, slug, kind: parsed.content.kind })
  revalidateLeadership(oldPath, newPath, `/team/${id}`, `/admin/leadership/${id}`)
  return { ok: true, message: `Published at ${newPath}` }
}

export async function rejectLeadershipChanges(id: number, note: string): Promise<ActionResult> {
  const actor = await requireEditor()
  const row = await getLeader(id)
  if (!row) return { ok: false, error: "Profile not found." }
  const reason = note.trim().slice(0, 1000)

  if (row.published) {
    // A live profile keeps its approved content; only the pending draft is discarded.
    await db.update(leadership).set({ draft: null, status: "approved", updatedAt: new Date() }).where(eq(leadership.id, id))
    await record(id, actor, "draft_discarded", null, reason)
    revalidatePath(`/admin/leadership/${id}`)
    return { ok: true, message: "Draft discarded. The live profile is unchanged." }
  }

  if (!reason) return { ok: false, error: "Add a short reason for the applicant." }
  await db
    .update(leadership)
    .set({ status: "rejected", reviewNote: reason, reviewedAt: new Date(), reviewedBy: actor.id, updatedAt: new Date() })
    .where(eq(leadership.id, id))
  await record(id, actor, "rejected", null, reason)
  revalidatePath("/admin/leadership")
  revalidatePath(`/admin/leadership/${id}`)
  return { ok: true, message: "Application rejected." }
}

export async function deleteLeadershipProfile(id: number): Promise<ActionResult> {
  const actor = await requireEditor()
  const row = await getLeader(id)
  if (!row) return { ok: false, error: "Profile not found." }

  await db.delete(leadershipRevisions).where(eq(leadershipRevisions.leadershipId, id))
  await db.delete(leadership).where(eq(leadership.id, id))
  try {
    await db.insert(auditLogs).values({
      actorId: actor.id,
      actorName: actor.name ?? "",
      action: "leadership.deleted",
      target: `${id}:${row.name}`.slice(0, 200),
    })
  } catch (e) {
    console.error("[leadership] audit log failed:", (e as Error).message)
  }
  revalidateLeadership(`/team/${id}`, `/admin/leadership/${id}`)
  return { ok: true, message: `Deleted ${row.name || "profile"}.` }
}

export async function listLeadershipQueue() {
  await requireEditor()
  return db
    .select({
      id: leadership.id,
      name: leadership.name,
      kind: leadership.kind,
      status: leadership.status,
      published: leadership.published,
      hasDraft: leadership.draft,
      submittedAt: leadership.submittedAt,
      updatedAt: leadership.updatedAt,
    })
    .from(leadership)
    .orderBy(desc(leadership.updatedAt))
    .limit(200)
}

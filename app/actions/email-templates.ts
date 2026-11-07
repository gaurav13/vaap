"use server"

import { revalidatePath } from "next/cache"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { auditLogs, emailTemplates, emailTemplateVersions } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { sendEmail } from "@/lib/mailer"
import { getTemplateDefinition, sampleVars, type EmailContent } from "@/lib/email-templates/registry"
import { renderWith } from "@/lib/email-templates/service"

type Result = { ok: true; message?: string } | { ok: false; error: string }

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin") throw new Error("Forbidden")
  return session.user
}

async function audit(actor: { id: string; name?: string | null }, action: string, target: string) {
  try {
    await db.insert(auditLogs).values({ actorId: actor.id, actorName: actor.name ?? "", action, target })
  } catch {
    // audit failures must never block the primary write
  }
}

const LIMITS: Record<keyof EmailContent, number> = {
  subject: 200,
  heading: 200,
  body: 8000,
  ctaLabel: 80,
  ctaUrl: 500,
  footnote: 1500,
  accentColor: 7,
  headerLabel: 80,
}

function sanitize(key: string, input: EmailContent): EmailContent | string {
  const def = getTemplateDefinition(key)
  if (!def) return "Unknown template."
  const out = {} as EmailContent
  for (const field of Object.keys(LIMITS) as (keyof EmailContent)[]) {
    const value = String(input?.[field] ?? "").replace(/\r\n/g, "\n")
    out[field] = field === "body" ? value.trim() : value.trim().replace(/\s*\n\s*/g, " ")
    if (out[field].length > LIMITS[field]) return `${field} is too long (max ${LIMITS[field]} characters).`
  }
  if (!out.subject) return "Subject is required."
  if (!out.heading) return "Heading is required."
  if (!out.body) return "Body content is required."
  if (!/^#[0-9a-fA-F]{6}$/.test(out.accentColor)) return "Brand colour must be a hex value like #15803d."
  if (out.ctaLabel && !out.ctaUrl) return "Add a button link, or clear the button label."
  if (out.ctaUrl && !/^(https?:\/\/|mailto:|\/|\{\{\s*[a-zA-Z0-9_]+\s*\}\})/.test(out.ctaUrl)) {
    return "Button link must start with https://, mailto:, / or be a variable like {{url}}."
  }
  return out
}

function revalidate(key: string) {
  revalidatePath("/admin/emails")
  revalidatePath(`/admin/emails/${key}`)
}

export async function saveEmailDraft(key: string, content: EmailContent): Promise<Result> {
  try {
    const admin = await requireAdmin()
    const clean = sanitize(key, content)
    if (typeof clean === "string") return { ok: false, error: clean }
    const now = new Date()
    await db
      .insert(emailTemplates)
      .values({ key, draftContent: clean, draftUpdatedAt: now, draftUpdatedBy: admin.name || admin.email, updatedAt: now })
      .onConflictDoUpdate({
        target: emailTemplates.key,
        set: { draftContent: clean, draftUpdatedAt: now, draftUpdatedBy: admin.name || admin.email, updatedAt: now },
      })
    await audit(admin, "email_template.draft_saved", key)
    revalidate(key)
    return { ok: true, message: "Draft saved. Live emails are unchanged until you publish." }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save draft." }
  }
}

export async function publishEmailTemplate(key: string, content: EmailContent): Promise<Result> {
  try {
    const admin = await requireAdmin()
    const clean = sanitize(key, content)
    if (typeof clean === "string") return { ok: false, error: clean }
    const by = admin.name || admin.email
    const now = new Date()

    const [{ next }] = await db
      .select({ next: sql<number>`coalesce(max(${emailTemplateVersions.version}), 0) + 1` })
      .from(emailTemplateVersions)
      .where(eq(emailTemplateVersions.templateKey, key))
    const version = Number(next)

    await db.insert(emailTemplateVersions).values({ templateKey: key, version, content: clean, publishedBy: by })
    await db
      .insert(emailTemplates)
      .values({ key, publishedContent: clean, publishedVersion: version, publishedAt: now, publishedBy: by, updatedAt: now })
      .onConflictDoUpdate({
        target: emailTemplates.key,
        set: {
          publishedContent: clean,
          publishedVersion: version,
          publishedAt: now,
          publishedBy: by,
          draftContent: null,
          draftUpdatedAt: null,
          draftUpdatedBy: null,
          updatedAt: now,
        },
      })
    await audit(admin, `email_template.published_v${version}`, key)
    revalidate(key)
    return { ok: true, message: `Version ${version} is now live.` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not publish." }
  }
}

export async function discardEmailDraft(key: string): Promise<Result> {
  try {
    const admin = await requireAdmin()
    await db
      .update(emailTemplates)
      .set({ draftContent: null, draftUpdatedAt: null, draftUpdatedBy: null, updatedAt: new Date() })
      .where(eq(emailTemplates.key, key))
    await audit(admin, "email_template.draft_discarded", key)
    revalidate(key)
    return { ok: true, message: "Draft discarded." }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not discard draft." }
  }
}

/** Loads a previously published version into the draft so it can be reviewed and republished. */
export async function restoreEmailVersion(key: string, versionId: number): Promise<Result> {
  try {
    const admin = await requireAdmin()
    const [row] = await db
      .select({ content: emailTemplateVersions.content, version: emailTemplateVersions.version })
      .from(emailTemplateVersions)
      .where(and(eq(emailTemplateVersions.id, versionId), eq(emailTemplateVersions.templateKey, key)))
      .limit(1)
    if (!row) return { ok: false, error: "Version not found." }
    const result = await saveEmailDraft(key, row.content)
    if (!result.ok) return result
    await audit(admin, `email_template.restored_v${row.version}`, key)
    return { ok: true, message: `Version ${row.version} loaded as a draft. Publish to make it live.` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not restore version." }
  }
}

export async function sendTestEmail(key: string, content: EmailContent, to: string): Promise<Result> {
  try {
    await requireAdmin()
    const recipient = to.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return { ok: false, error: "Enter a valid email address." }
    const clean = sanitize(key, content)
    if (typeof clean === "string") return { ok: false, error: clean }
    const def = getTemplateDefinition(key)!
    const { subject, html, text } = renderWith(clean, sampleVars(def))
    const sent = await sendEmail({ to: recipient, subject: `[TEST] ${subject}`, html, text, templateKey: key, isTest: true })
    if (!sent) return { ok: false, error: "Email delivery is not configured on the server." }
    return { ok: true, message: `Test email sent to ${recipient}.` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not send test email." }
  }
}

export async function getEmailTemplateVersions(key: string) {
  await requireAdmin()
  return db
    .select()
    .from(emailTemplateVersions)
    .where(eq(emailTemplateVersions.templateKey, key))
    .orderBy(desc(emailTemplateVersions.version))
    .limit(25)
}

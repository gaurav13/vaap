"use server"

import { and, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { customEmailTemplates, newsletterCampaigns } from "@/lib/db/schema"
import { logActivity, requireManager, requireOperator } from "@/lib/rbac"
import { normalizeContent } from "@/lib/newsletter/validate"
import type { CampaignInput } from "@/app/actions/newsletters"
import { renderNewsletter } from "@/lib/newsletter/engine"
import { sendEmail } from "@/lib/mailer"
import { EMAIL_RE } from "@/lib/newsletter/content"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }
const fail = (err: unknown): { ok: false; error: string } => ({ ok: false, error: err instanceof Error ? err.message : "Something went wrong." })

async function getTemplate(id: number) {
  const [row] = await db.select().from(customEmailTemplates).where(and(eq(customEmailTemplates.id, id), isNull(customEmailTemplates.deletedAt)))
  if (!row) throw new Error("Template not found.")
  return row
}

export async function saveEmailTemplate(id: number | null, name: string, input: CampaignInput): Promise<Result<{ id: number }>> {
  try {
    const actor = await requireOperator()
    const label = name.trim().slice(0, 120)
    if (!label) throw new Error("Give the template a name.")
    const data = { ...normalizeContent(input.content), name: label, isMarketing: Boolean(input.isMarketing), audience: input.audience }
    if (id) {
      await getTemplate(id)
      await db.update(customEmailTemplates).set({ ...data, updatedByName: actor.name, updatedAt: new Date() }).where(eq(customEmailTemplates.id, id))
      await logActivity(actor, "email_template.update", { entityType: "custom_email_template", entityId: id, target: label })
      revalidatePath("/admin/custom-emails")
      return { ok: true, id }
    }
    const [row] = await db
      .insert(customEmailTemplates)
      .values({ ...data, createdByName: actor.name, updatedByName: actor.name })
      .returning({ id: customEmailTemplates.id })
    await logActivity(actor, "email_template.create", { entityType: "custom_email_template", entityId: row.id, target: label })
    revalidatePath("/admin/custom-emails")
    return { ok: true, id: row.id }
  } catch (err) {
    return fail(err)
  }
}

export async function duplicateEmailTemplate(id: number): Promise<Result<{ id: number }>> {
  try {
    const actor = await requireOperator()
    const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...src } = await getTemplate(id)
    const [row] = await db
      .insert(customEmailTemplates)
      .values({ ...src, name: `${src.name} (copy)`, createdByName: actor.name, updatedByName: actor.name })
      .returning({ id: customEmailTemplates.id })
    await logActivity(actor, "email_template.duplicate", { entityType: "custom_email_template", entityId: row.id, target: src.name })
    revalidatePath("/admin/custom-emails")
    return { ok: true, id: row.id }
  } catch (err) {
    return fail(err)
  }
}

/** Soft delete: emails already sent from the template keep their own snapshot. */
export async function deleteEmailTemplate(id: number): Promise<Result> {
  try {
    const actor = await requireManager()
    const row = await getTemplate(id)
    await db.update(customEmailTemplates).set({ deletedAt: new Date(), updatedByName: actor.name }).where(eq(customEmailTemplates.id, id))
    await logActivity(actor, "email_template.delete", { entityType: "custom_email_template", entityId: id, target: row.name })
    revalidatePath("/admin/custom-emails")
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/**
 * Snapshots the template into a new draft send. Later template edits never
 * change what was sent, and the send is scheduled through the normal Admin flow.
 */
export async function createSendFromTemplate(id: number): Promise<Result<{ campaignId: number }>> {
  try {
    const actor = await requireOperator()
    const t = await getTemplate(id)
    const [row] = await db
      .insert(newsletterCampaigns)
      .values({
        kind: "custom",
        templateId: t.id,
        title: t.title || t.name,
        subject: t.subject || t.title || t.name,
        previewText: t.previewText,
        subheading: t.subheading,
        bannerUrl: t.bannerUrl,
        bodyHtml: t.bodyHtml,
        blocks: t.blocks,
        ctaLabel: t.ctaLabel,
        ctaUrl: t.ctaUrl,
        ctaColor: t.ctaColor,
        footerHtml: t.footerHtml,
        isMarketing: t.isMarketing,
        audience: t.audience,
        createdBy: actor.id,
        createdByName: actor.name,
        updatedByName: actor.name,
      })
      .returning({ id: newsletterCampaigns.id })
    await logActivity(actor, "custom.create", { entityType: "custom", entityId: row.id, target: t.name, details: `from template #${t.id}` })
    revalidatePath("/admin/custom-emails")
    return { ok: true, campaignId: row.id }
  } catch (err) {
    return fail(err)
  }
}

export async function sendTemplateTest(id: number, email: string): Promise<Result> {
  try {
    const actor = await requireManager()
    const to = email.trim().toLowerCase()
    if (!EMAIL_RE.test(to)) throw new Error("Enter a valid email address.")
    const t = await getTemplate(id)
    const { html, text, subject } = renderNewsletter({ ...t, title: t.title || t.name, subject: t.subject || t.title || t.name }, { name: actor.name })
    const delivered = await sendEmail({ to, subject: `[Test] ${subject}`, html, text, isTest: true })
    if (!delivered) throw new Error("The test email could not be delivered.")
    await logActivity(actor, "custom_template.test", { entityType: "custom_template", entityId: id, target: to })
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

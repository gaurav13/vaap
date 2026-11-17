"use server"

import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { newsletterCampaigns, newsletterRecipients, newsletterSubscribers } from "@/lib/db/schema"
import { logActivity, requireManager, requireOperator } from "@/lib/rbac"
import { sendEmail } from "@/lib/mailer"
import { renderNewsletter, startCampaign } from "@/lib/newsletter/engine"
import { resolveAudience, searchDirectory } from "@/lib/newsletter/audience"
import { normalizeContent } from "@/lib/newsletter/validate"
import { EMAIL_RE, type AudienceSelection, type CampaignContent } from "@/lib/newsletter/content"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }
export type CampaignKind = "newsletter" | "custom"
export type CampaignInput = { content: CampaignContent; audience: AudienceSelection; isMarketing: boolean }

function fail(err: unknown): { ok: false; error: string } {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." }
}

const PATHS = ["/admin/newsletters", "/admin/custom-emails"]
const refresh = () => PATHS.forEach((p) => revalidatePath(p))

async function getEditable(id: number) {
  const [row] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id))
  if (!row) throw new Error("Email not found.")
  if (row.status !== "draft" && row.status !== "scheduled") throw new Error("This email has already been sent and can no longer be edited.")
  return row
}

function toRow(input: CampaignInput, kind: CampaignKind) {
  const c = normalizeContent(input.content)
  return {
    ...c,
    kind,
    // Newsletters are always marketing; custom emails can be service messages.
    isMarketing: kind === "newsletter" ? true : Boolean(input.isMarketing),
    audience: input.audience,
  }
}

/** Staff and Admins can draft. Sending is separate and Admin-only. */
export async function saveCampaign(id: number | null, kind: CampaignKind, input: CampaignInput): Promise<Result<{ id: number }>> {
  try {
    const actor = await requireOperator()
    const data = toRow(input, kind)
    if (id) {
      const existing = await getEditable(id)
      // A scheduled email edited by Staff goes back to draft so an Admin re-approves it.
      const status = existing.status === "scheduled" && actor.role === "staff" ? "draft" : existing.status
      await db.update(newsletterCampaigns).set({ ...data, status, updatedByName: actor.name, updatedAt: new Date() }).where(eq(newsletterCampaigns.id, id))
      await logActivity(actor, `${kind}.update`, { entityType: kind, entityId: id, target: data.title })
      refresh()
      return { ok: true, id }
    }
    const [row] = await db
      .insert(newsletterCampaigns)
      .values({ ...data, createdBy: actor.id, createdByName: actor.name, updatedByName: actor.name })
      .returning({ id: newsletterCampaigns.id })
    await logActivity(actor, `${kind}.create`, { entityType: kind, entityId: row.id, target: data.title })
    refresh()
    return { ok: true, id: row.id }
  } catch (err) {
    return fail(err)
  }
}

export async function previewAudienceReport(audience: AudienceSelection, isMarketing: boolean) {
  try {
    await requireOperator()
    const { report } = await resolveAudience(audience, { marketing: isMarketing })
    return { ok: true as const, report }
  } catch (err) {
    return fail(err)
  }
}

/** Names and emails are personal data, so the full list is Admin-only. */
export async function listAudienceRecipients(audience: AudienceSelection, isMarketing: boolean) {
  try {
    await requireManager()
    const { report, recipients } = await resolveAudience(audience, { marketing: isMarketing })
    return {
      ok: true as const,
      report,
      truncated: recipients.length > 5000,
      recipients: recipients.slice(0, 5000).map((r) => ({ email: r.email, name: r.name, status: r.statusLabel })),
    }
  } catch (err) {
    return fail(err)
  }
}

export async function searchContacts(query: string) {
  try {
    await requireManager()
    const rows = await searchDirectory(query.slice(0, 100))
    return { ok: true as const, contacts: rows.map((r) => ({ email: r.email, name: r.name, status: r.statusLabel })) }
  } catch (err) {
    return fail(err)
  }
}

/** Server-rendered so the preview is exactly what recipients receive. */
export async function renderCampaignPreview(content: CampaignContent, isMarketing: boolean) {
  try {
    const actor = await requireOperator()
    const c = normalizeContent(content, { forPreview: true })
    const { html, subject } = renderNewsletter({ ...c, isMarketing }, { name: actor.name || "Ayesha Khan" })
    return { ok: true as const, html, subject }
  } catch (err) {
    return fail(err)
  }
}

export async function sendCampaignTest(id: number, email: string): Promise<Result> {
  try {
    const actor = await requireManager()
    const to = email.trim().toLowerCase()
    if (!EMAIL_RE.test(to)) throw new Error("Enter a valid email address.")
    const [row] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id))
    if (!row) throw new Error("Email not found.")
    const { html, text } = renderNewsletter(row, { name: actor.name })
    const delivered = await sendEmail({ to, subject: `[Test] ${row.subject}`, html, text, isTest: true })
    if (!delivered) throw new Error("The test email could not be delivered.")
    await logActivity(actor, `${row.kind}.test`, { entityType: row.kind, entityId: id, target: to })
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// Sending, scheduling and cancelling reach real inboxes, so they need an Admin.
export async function scheduleCampaign(id: number, when: string | null): Promise<Result<{ recipients: number }>> {
  try {
    const actor = await requireManager()
    const row = await getEditable(id)
    if (!row.subject.trim()) throw new Error("Add a subject before sending.")
    if (!row.bodyHtml.trim() && !(row.blocks ?? []).length) throw new Error("Add some content before sending.")
    const { report } = await resolveAudience(row.audience, { marketing: row.isMarketing })
    if (report.final === 0) throw new Error("The selected audience has no reachable recipients.")

    if (when) {
      const at = new Date(when)
      if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() - 60_000) throw new Error("Pick a time in the future.")
      await db
        .update(newsletterCampaigns)
        .set({ status: "scheduled", scheduledAt: at, sentByName: actor.name, updatedByName: actor.name, updatedAt: new Date() })
        .where(eq(newsletterCampaigns.id, id))
      await logActivity(actor, `${row.kind}.schedule`, { entityType: row.kind, entityId: id, target: row.title, details: `${at.toISOString()} · ${report.final} recipients` })
    } else {
      await db.update(newsletterCampaigns).set({ sentByName: actor.name }).where(eq(newsletterCampaigns.id, id))
      const started = await startCampaign(id)
      if (!started) throw new Error("This email is already being sent.")
      await logActivity(actor, `${row.kind}.send`, { entityType: row.kind, entityId: id, target: row.title, details: `${report.final} recipients` })
    }
    refresh()
    return { ok: true, recipients: report.final }
  } catch (err) {
    return fail(err)
  }
}

export async function cancelCampaign(id: number): Promise<Result> {
  try {
    const actor = await requireManager()
    const [row] = await db
      .update(newsletterCampaigns)
      .set({ status: "cancelled", updatedByName: actor.name, updatedAt: new Date() })
      .where(and(eq(newsletterCampaigns.id, id), inArray(newsletterCampaigns.status, ["scheduled", "sending"])))
      .returning({ title: newsletterCampaigns.title, kind: newsletterCampaigns.kind })
    if (!row) throw new Error("Only scheduled or sending emails can be cancelled.")
    await db
      .update(newsletterRecipients)
      .set({ status: "skipped", lastError: "Campaign cancelled" })
      .where(and(eq(newsletterRecipients.campaignId, id), eq(newsletterRecipients.status, "queued")))
    await logActivity(actor, `${row.kind}.cancel`, { entityType: row.kind, entityId: id, target: row.title })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

/** Only unsent drafts can be deleted; sent records stay for the audit trail. */
export async function deleteCampaign(id: number): Promise<Result> {
  try {
    const actor = await requireOperator()
    const row = await getEditable(id)
    if (row.status === "scheduled" && actor.role === "staff") throw new Error("Only an Admin can delete a scheduled email.")
    await db.delete(newsletterCampaigns).where(eq(newsletterCampaigns.id, id))
    await logActivity(actor, `${row.kind}.delete`, { entityType: row.kind, entityId: id, target: row.title })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function duplicateCampaign(id: number): Promise<Result<{ id: number }>> {
  try {
    const actor = await requireOperator()
    const [src] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id))
    if (!src) throw new Error("Email not found.")
    const [row] = await db
      .insert(newsletterCampaigns)
      .values({
        kind: src.kind,
        title: `${src.title} (copy)`,
        subject: src.subject,
        previewText: src.previewText,
        subheading: src.subheading,
        bannerUrl: src.bannerUrl,
        bodyHtml: src.bodyHtml,
        blocks: src.blocks,
        ctaLabel: src.ctaLabel,
        ctaUrl: src.ctaUrl,
        ctaColor: src.ctaColor,
        footerHtml: src.footerHtml,
        isMarketing: src.isMarketing,
        templateId: src.templateId,
        audience: src.audience,
        createdBy: actor.id,
        createdByName: actor.name,
        updatedByName: actor.name,
      })
      .returning({ id: newsletterCampaigns.id })
    await logActivity(actor, `${src.kind}.duplicate`, { entityType: src.kind, entityId: row.id, target: src.title })
    refresh()
    return { ok: true, id: row.id }
  } catch (err) {
    return fail(err)
  }
}

export async function retryFailedRecipients(id: number): Promise<Result<{ count: number }>> {
  try {
    const actor = await requireManager()
    const rows = await db
      .update(newsletterRecipients)
      .set({ status: "queued", attempts: 0, nextAttemptAt: null, lastError: null })
      .where(and(eq(newsletterRecipients.campaignId, id), eq(newsletterRecipients.status, "failed")))
      .returning({ id: newsletterRecipients.id })
    if (rows.length) {
      await db.update(newsletterCampaigns).set({ status: "sending", completedAt: null, updatedAt: new Date() }).where(eq(newsletterCampaigns.id, id))
    }
    await logActivity(actor, "newsletter.retry", { entityType: "newsletter", entityId: id, details: `${rows.length} recipients` })
    refresh()
    return { ok: true, count: rows.length }
  } catch (err) {
    return fail(err)
  }
}

export async function getNewsletterStats(id: number) {
  await requireOperator()
  const [s] = await db
    .select({
      total: sql<number>`count(*)::int`,
      queued: sql<number>`count(*) filter (where ${newsletterRecipients.status} = 'queued')::int`,
      sent: sql<number>`count(*) filter (where ${newsletterRecipients.status} = 'sent')::int`,
      failed: sql<number>`count(*) filter (where ${newsletterRecipients.status} = 'failed')::int`,
      bounced: sql<number>`count(*) filter (where ${newsletterRecipients.status} = 'bounced')::int`,
      skipped: sql<number>`count(*) filter (where ${newsletterRecipients.status} = 'skipped')::int`,
      opened: sql<number>`count(*) filter (where ${newsletterRecipients.openedAt} is not null)::int`,
      clicked: sql<number>`count(*) filter (where ${newsletterRecipients.clickedAt} is not null)::int`,
      unsubscribed: sql<number>`count(*) filter (where ${newsletterRecipients.unsubscribedAt} is not null)::int`,
    })
    .from(newsletterRecipients)
    .where(eq(newsletterRecipients.campaignId, id))
  const recentFailures = await db
    .select({ email: newsletterRecipients.email, error: newsletterRecipients.lastError, status: newsletterRecipients.status })
    .from(newsletterRecipients)
    .where(and(eq(newsletterRecipients.campaignId, id), inArray(newsletterRecipients.status, ["failed", "bounced"])))
    .orderBy(desc(newsletterRecipients.id))
    .limit(20)
  return { stats: s, recentFailures }
}

/** The recipients a sent campaign was actually queued for (Admin-only: personal data). */
export async function getCampaignRecipients(id: number) {
  try {
    await requireManager()
    const rows = await db
      .select({ email: newsletterRecipients.email, name: newsletterRecipients.name, segment: newsletterRecipients.segmentLabel, status: newsletterRecipients.status, sentAt: newsletterRecipients.sentAt })
      .from(newsletterRecipients)
      .where(eq(newsletterRecipients.campaignId, id))
      .orderBy(newsletterRecipients.id)
      .limit(5000)
    return { ok: true as const, rows: rows.map((r) => ({ ...r, sentAt: r.sentAt?.toISOString() ?? null })) }
  } catch (err) {
    return fail(err)
  }
}

// --- Subscribers (non-member opt-ins) ----------------------------------------

export async function addNewsletterSubscribers(raw: string, consentNote: string): Promise<Result<{ added: number; skipped: number }>> {
  try {
    const actor = await requireManager()
    if (!consentNote.trim()) throw new Error("Record how these contacts consented to receive emails.")
    const lines = raw.split(/[\n,;]+/).map((l) => l.trim()).filter(Boolean)
    if (lines.length > 2000) throw new Error("Add at most 2,000 contacts at a time.")
    const rows = lines
      .map((l) => {
        const m = l.match(/^(.*?)<([^>]+)>$/)
        const email = (m ? m[2] : l).trim().toLowerCase()
        return { email, name: m ? m[1].trim().replace(/^"|"$/g, "") : "" }
      })
      .filter((r) => EMAIL_RE.test(r.email))
    const inserted = rows.length
      ? await db
          .insert(newsletterSubscribers)
          .values(rows.map((r) => ({ ...r, source: "admin", consentNote: consentNote.trim().slice(0, 300) })))
          .onConflictDoNothing()
          .returning({ id: newsletterSubscribers.id })
      : []
    await logActivity(actor, "newsletter.subscribers.add", { entityType: "newsletter", details: `${inserted.length} added` })
    refresh()
    return { ok: true, added: inserted.length, skipped: lines.length - inserted.length }
  } catch (err) {
    return fail(err)
  }
}

export async function setSubscriberStatus(id: number, status: "subscribed" | "unsubscribed"): Promise<Result> {
  try {
    const actor = await requireManager()
    await db.update(newsletterSubscribers).set({ status }).where(eq(newsletterSubscribers.id, id))
    await logActivity(actor, `newsletter.subscriber.${status}`, { entityType: "newsletter_subscriber", entityId: id })
    refresh()
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

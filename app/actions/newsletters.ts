"use server"

import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { newsletterCampaigns, newsletterRecipients, newsletterSubscribers, type NewsletterAudience } from "@/lib/db/schema"
import { logActivity, requireManager, requireOperator } from "@/lib/rbac"
import { sendEmail } from "@/lib/mailer"
import { describeAudience, renderNewsletter, resolveAudience, sanitizeNewsletterHtml, startCampaign } from "@/lib/newsletter/engine"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/\S+$/i

function fail(err: unknown): { ok: false; error: string } {
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." }
}

function readAudience(fd: FormData): NewsletterAudience {
  const type = String(fd.get("audienceType") ?? "all")
  if (type === "members" || type === "non-members" || type === "all") return { type }
  const categories = fd.getAll("categories").map(String).filter(Boolean)
  const segments = fd
    .getAll("segments")
    .map(String)
    .filter((s): s is "subscribers" | "registered" => s === "subscribers" || s === "registered")
  return { type: "custom", categories, segments }
}

function readCampaign(fd: FormData) {
  const title = String(fd.get("title") ?? "").trim()
  const subject = String(fd.get("subject") ?? "").trim()
  const ctaUrl = String(fd.get("ctaUrl") ?? "").trim()
  const bannerUrl = String(fd.get("bannerUrl") ?? "").trim()
  if (!title) throw new Error("Title is required.")
  if (title.length > 200 || subject.length > 200) throw new Error("Title and subject must be under 200 characters.")
  if (ctaUrl && !URL_RE.test(ctaUrl)) throw new Error("Button link must start with http:// or https://")
  if (bannerUrl && !URL_RE.test(bannerUrl) && !bannerUrl.startsWith("/")) throw new Error("Banner image must be a valid URL.")
  return {
    title,
    subject: subject || title,
    previewText: String(fd.get("previewText") ?? "").trim().slice(0, 300),
    bannerUrl: bannerUrl || null,
    bodyHtml: sanitizeNewsletterHtml(String(fd.get("bodyHtml") ?? "")),
    ctaLabel: String(fd.get("ctaLabel") ?? "").trim().slice(0, 80) || null,
    ctaUrl: ctaUrl || null,
    audience: readAudience(fd),
  }
}

async function getEditable(id: number) {
  const [row] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id))
  if (!row) throw new Error("Newsletter not found.")
  if (row.status !== "draft" && row.status !== "scheduled") throw new Error("This newsletter has already been sent and can no longer be edited.")
  return row
}

export async function saveNewsletter(id: number | null, fd: FormData): Promise<Result<{ id: number }>> {
  try {
    const actor = await requireOperator()
    const data = readCampaign(fd)
    if (id) {
      await getEditable(id)
      await db.update(newsletterCampaigns).set({ ...data, updatedByName: actor.name, updatedAt: new Date() }).where(eq(newsletterCampaigns.id, id))
      await logActivity(actor, "newsletter.update", { entityType: "newsletter", entityId: id, target: data.title })
      revalidatePath("/admin/newsletters")
      return { ok: true, id }
    }
    const [row] = await db
      .insert(newsletterCampaigns)
      .values({ ...data, createdBy: actor.id, createdByName: actor.name, updatedByName: actor.name })
      .returning({ id: newsletterCampaigns.id })
    await logActivity(actor, "newsletter.create", { entityType: "newsletter", entityId: row.id, target: data.title })
    revalidatePath("/admin/newsletters")
    return { ok: true, id: row.id }
  } catch (err) {
    return fail(err)
  }
}

export async function previewAudience(fd: FormData): Promise<Result<{ total: number; members: number; nonMembers: number; suppressed: number; label: string }>> {
  try {
    await requireOperator()
    const audience = readAudience(fd)
    const r = await resolveAudience(audience)
    return { ok: true, total: r.contacts.length, members: r.members, nonMembers: r.nonMembers, suppressed: r.suppressed, label: describeAudience(audience) }
  } catch (err) {
    return fail(err)
  }
}

export async function sendNewsletterTest(id: number, email: string): Promise<Result> {
  try {
    const actor = await requireOperator()
    const to = email.trim().toLowerCase()
    if (!EMAIL_RE.test(to)) throw new Error("Enter a valid email address.")
    const [row] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id))
    if (!row) throw new Error("Newsletter not found.")
    const { html, text } = renderNewsletter(row, { name: actor.name })
    const delivered = await sendEmail({ to, subject: `[Test] ${row.subject}`, html, text, isTest: true })
    if (!delivered) throw new Error("The test email could not be delivered.")
    await logActivity(actor, "newsletter.test", { entityType: "newsletter", entityId: id, target: to })
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

// Sending, scheduling and cancelling reach real inboxes, so they need an Admin.
export async function scheduleNewsletter(id: number, when: string | null): Promise<Result> {
  try {
    const actor = await requireManager()
    const row = await getEditable(id)
    if (!row.subject.trim() || !row.bodyHtml.trim()) throw new Error("Add a subject and content before sending.")
    const { contacts } = await resolveAudience(row.audience)
    if (contacts.length === 0) throw new Error("The selected audience has no reachable recipients.")

    if (when) {
      const at = new Date(when)
      if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() - 60_000) throw new Error("Pick a time in the future.")
      await db.update(newsletterCampaigns).set({ status: "scheduled", scheduledAt: at, updatedByName: actor.name, updatedAt: new Date() }).where(eq(newsletterCampaigns.id, id))
      await logActivity(actor, "newsletter.schedule", { entityType: "newsletter", entityId: id, target: row.title, details: at.toISOString() })
    } else {
      const started = await startCampaign(id)
      if (!started) throw new Error("This newsletter is already being sent.")
      await logActivity(actor, "newsletter.send", { entityType: "newsletter", entityId: id, target: row.title, details: `${contacts.length} recipients` })
    }
    revalidatePath("/admin/newsletters")
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function cancelNewsletter(id: number): Promise<Result> {
  try {
    const actor = await requireManager()
    const [row] = await db
      .update(newsletterCampaigns)
      .set({ status: "cancelled", updatedByName: actor.name, updatedAt: new Date() })
      .where(and(eq(newsletterCampaigns.id, id), inArray(newsletterCampaigns.status, ["scheduled", "sending"])))
      .returning({ title: newsletterCampaigns.title })
    if (!row) throw new Error("Only scheduled or sending newsletters can be cancelled.")
    await db
      .update(newsletterRecipients)
      .set({ status: "skipped", lastError: "Campaign cancelled" })
      .where(and(eq(newsletterRecipients.campaignId, id), eq(newsletterRecipients.status, "queued")))
    await logActivity(actor, "newsletter.cancel", { entityType: "newsletter", entityId: id, target: row.title })
    revalidatePath("/admin/newsletters")
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function deleteNewsletter(id: number): Promise<Result> {
  try {
    const actor = await requireOperator()
    const row = await getEditable(id)
    await db.delete(newsletterCampaigns).where(eq(newsletterCampaigns.id, id))
    await logActivity(actor, "newsletter.delete", { entityType: "newsletter", entityId: id, target: row.title })
    revalidatePath("/admin/newsletters")
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

export async function duplicateNewsletter(id: number): Promise<Result<{ id: number }>> {
  try {
    const actor = await requireOperator()
    const [src] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id))
    if (!src) throw new Error("Newsletter not found.")
    const [row] = await db
      .insert(newsletterCampaigns)
      .values({
        title: `${src.title} (copy)`,
        subject: src.subject,
        previewText: src.previewText,
        bannerUrl: src.bannerUrl,
        bodyHtml: src.bodyHtml,
        ctaLabel: src.ctaLabel,
        ctaUrl: src.ctaUrl,
        audience: src.audience,
        createdBy: actor.id,
        createdByName: actor.name,
        updatedByName: actor.name,
      })
      .returning({ id: newsletterCampaigns.id })
    revalidatePath("/admin/newsletters")
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
    revalidatePath("/admin/newsletters")
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
    revalidatePath("/admin/newsletters")
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
    revalidatePath("/admin/newsletters")
    return { ok: true }
  } catch (err) {
    return fail(err)
  }
}

import "server-only"
import crypto from "crypto"
import sanitizeHtml from "sanitize-html"
import { and, eq, gte, inArray, isNull, ne, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  emailSuppressions,
  members,
  newsletterCampaigns,
  newsletterRecipients,
  newsletterSubscribers,
  user,
  type NewsletterAudience,
} from "@/lib/db/schema"
import { sendEmail } from "@/lib/mailer"
import { createToken } from "@/lib/email-tokens"
import { appBaseUrl } from "@/lib/email-templates/service"
import { isIssuedMembership } from "@/lib/membership-state"

export const NEWSLETTER_TOPIC = "newsletter"
const MAX_ATTEMPTS = 3
const SEND_GAP_MS = 400
const lower = (s: string | null | undefined) => (s ?? "").trim().toLowerCase()

/** Gmail Workspace SMTP caps relayed mail per rolling day; stay under it unless configured otherwise. */
export function dailySendLimit() {
  const n = Number(process.env.NEWSLETTER_DAILY_LIMIT)
  return Number.isFinite(n) && n > 0 ? n : 450
}

type Campaign = typeof newsletterCampaigns.$inferSelect
export type AudienceContact = { email: string; name: string; isMember: boolean }

// --- Audience ---------------------------------------------------------------

async function activeMembers(categories?: string[]): Promise<AudienceContact[]> {
  const now = new Date()
  const rows = await db
    .select()
    .from(members)
    .where(
      and(
        isNull(members.deletedAt),
        eq(members.status, "active"),
        eq(members.goodStanding, true),
        or(isNull(members.expiresAt), gte(members.expiresAt, now)),
        categories?.length ? inArray(members.category, categories) : undefined,
      ),
    )
  return rows.filter(isIssuedMembership).map((m) => ({ email: lower(m.email), name: m.name, isMember: true }))
}

async function subscriberContacts(): Promise<AudienceContact[]> {
  const rows = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.status, "subscribed"))
  return rows.map((r) => ({ email: lower(r.email), name: r.name, isMember: false }))
}

async function registeredContacts(): Promise<AudienceContact[]> {
  const rows = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(and(eq(user.emailVerified, true), ne(user.role, "admin"), ne(user.role, "manager"), ne(user.role, "staff")))
  return rows.map((r) => ({ email: lower(r.email), name: r.name ?? "", isMember: false }))
}

async function suppressedEmails() {
  const rows = await db
    .select({ email: emailSuppressions.email })
    .from(emailSuppressions)
    .where(inArray(emailSuppressions.topic, [NEWSLETTER_TOPIC, "all"]))
  return new Set(rows.map((r) => lower(r.email)))
}

/**
 * Resolves an audience to a de-duplicated, suppression-filtered contact list.
 * A person who is both a member and a subscriber appears once, as a member.
 */
export async function resolveAudience(audience: NewsletterAudience) {
  const allMembers = await activeMembers()
  const memberEmails = new Set(allMembers.map((m) => m.email))
  const nonMembers = async (segments: ("subscribers" | "registered")[]) => {
    const lists = await Promise.all(segments.map((s) => (s === "subscribers" ? subscriberContacts() : registeredContacts())))
    return lists.flat().filter((c) => !memberEmails.has(c.email))
  }

  let list: AudienceContact[] = []
  if (audience.type === "members") list = allMembers
  else if (audience.type === "non-members") list = await nonMembers(["subscribers", "registered"])
  else if (audience.type === "all") list = [...allMembers, ...(await nonMembers(["subscribers", "registered"]))]
  else {
    const cats = audience.categories ?? []
    list = [...(cats.length ? await activeMembers(cats) : []), ...(await nonMembers(audience.segments ?? []))]
  }

  const blocked = await suppressedEmails()
  const seen = new Map<string, AudienceContact>()
  let suppressed = 0
  for (const c of list) {
    if (!c.email || !c.email.includes("@")) continue
    if (blocked.has(c.email)) {
      suppressed++
      continue
    }
    if (!seen.has(c.email)) seen.set(c.email, c)
  }
  const contacts = [...seen.values()]
  return { contacts, suppressed, members: contacts.filter((c) => c.isMember).length, nonMembers: contacts.filter((c) => !c.isMember).length }
}

export function describeAudience(a: NewsletterAudience) {
  if (a.type === "all") return "All subscribers"
  if (a.type === "members") return "Members only"
  if (a.type === "non-members") return "Non-members only"
  const parts = [...(a.categories ?? []), ...(a.segments ?? []).map((s) => (s === "subscribers" ? "Newsletter subscribers" : "Registered accounts"))]
  return parts.length ? `Custom: ${parts.join(", ")}` : "Custom (empty)"
}

// --- Rendering --------------------------------------------------------------

export function sanitizeNewsletterHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "img", "hr", "span", "div", "table", "tbody", "tr", "td", "th"],
    allowedAttributes: { a: ["href", "title"], img: ["src", "alt", "width", "height"], td: ["colspan", "align"], th: ["colspan", "align"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["https", "http"] },
  })
}

function sign(value: string) {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not configured")
  return crypto.createHmac("sha256", secret).update(value).digest("base64url").slice(0, 32)
}

export function verifyClick(token: string, url: string, sig: string) {
  const expected = Buffer.from(sign(`${token}|${url}`))
  const given = Buffer.from(sig)
  return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}

function trackedUrl(base: string, token: string | null, url: string) {
  if (!token || !/^https?:\/\//i.test(url)) return url
  return `${base}/api/newsletter/c?r=${encodeURIComponent(token)}&u=${encodeURIComponent(url)}&s=${sign(`${token}|${url}`)}`
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

/** Builds the branded, mobile-responsive email. A null token renders an untracked preview. */
export function renderNewsletter(
  c: Pick<Campaign, "title" | "subject" | "previewText" | "bannerUrl" | "bodyHtml" | "ctaLabel" | "ctaUrl">,
  opts: { name?: string; token?: string | null; unsubscribeUrl?: string } = {},
) {
  const base = appBaseUrl()
  const token = opts.token ?? null
  const body = sanitizeNewsletterHtml(c.bodyHtml)
    .replace(/<a ([^>]*?)href="([^"]+)"/g, (_m, pre: string, href: string) => `<a ${pre}href="${esc(trackedUrl(base, token, href.replace(/&amp;/g, "&")))}" style="color:#15803d"`)
    .replace(/<img /g, '<img style="max-width:100%;height:auto;border-radius:8px" ')
    .replace(/<p>/g, '<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937">')
    .replace(/<h2>/g, '<h2 style="margin:24px 0 12px;font-size:20px;line-height:1.3;color:#14532d">')
    .replace(/<h3>/g, '<h3 style="margin:20px 0 10px;font-size:17px;line-height:1.3;color:#14532d">')
  const name = opts.name?.trim() || "VAAP community member"
  const cta =
    c.ctaLabel && c.ctaUrl && /^https?:\/\//i.test(c.ctaUrl)
      ? `<p style="margin:24px 0"><a href="${esc(trackedUrl(base, token, c.ctaUrl))}" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600">${esc(c.ctaLabel)}</a></p>`
      : ""
  const banner = c.bannerUrl && /^https?:\/\//i.test(c.bannerUrl) ? `<img src="${esc(c.bannerUrl)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto" />` : ""
  const pixel = token ? `<img src="${base}/api/newsletter/o?r=${encodeURIComponent(token)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />` : ""
  const unsub = opts.unsubscribeUrl
    ? `<a href="${esc(opts.unsubscribeUrl)}" style="color:#6b7280">Unsubscribe</a> from VAAP newsletters.`
    : "Unsubscribe link appears here in delivered emails."

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>${esc(c.subject || c.title)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.previewText)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif">
<tr><td style="background:#14532d;padding:18px 24px;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:.5px">VAAP <span style="font-weight:400;opacity:.85">· Virtual Assets Association of Pakistan</span></td></tr>
${banner ? `<tr><td>${banner}</td></tr>` : ""}
<tr><td style="padding:28px 24px 8px">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#14532d">${esc(c.title)}</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937">Dear ${esc(name)},</p>
${body}${cta}
</td></tr>
<tr><td style="padding:16px 24px 24px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280">
You are receiving this because you are a VAAP member or subscribed to VAAP updates. ${unsub}<br/>
<a href="${base}" style="color:#6b7280">vaap.org.pk</a>
</td></tr></table>${pixel}
</td></tr></table></body></html>`

  const text = `${c.title}\n\nDear ${name},\n\n${sanitizeHtml(c.bodyHtml, { allowedTags: [], allowedAttributes: {} }).replace(/\n{3,}/g, "\n\n").trim()}\n\n${c.ctaLabel && c.ctaUrl ? `${c.ctaLabel}: ${c.ctaUrl}\n\n` : ""}${opts.unsubscribeUrl ? `Unsubscribe: ${opts.unsubscribeUrl}` : ""}`
  return { subject: c.subject || c.title, html, text }
}

function unsubscribeUrl(email: string, recipientId: number) {
  return `${appBaseUrl()}/api/email/unsubscribe?token=${encodeURIComponent(createToken("unsubscribe", email, { topic: NEWSLETTER_TOPIC, id: recipientId, ttlDays: 365 }))}`
}

// --- Queue ------------------------------------------------------------------

/** Snapshots the audience into the recipient queue. Idempotent per campaign + email. */
export async function materializeRecipients(campaign: Campaign) {
  const { contacts } = await resolveAudience(campaign.audience)
  for (let i = 0; i < contacts.length; i += 500) {
    const chunk = contacts.slice(i, i + 500)
    await db
      .insert(newsletterRecipients)
      .values(chunk.map((c) => ({ campaignId: campaign.id, email: c.email, name: c.name, isMember: c.isMember, token: crypto.randomBytes(18).toString("base64url") })))
      .onConflictDoNothing()
  }
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(newsletterRecipients).where(eq(newsletterRecipients.campaignId, campaign.id))
  await db.update(newsletterCampaigns).set({ totalRecipients: n, updatedAt: new Date() }).where(eq(newsletterCampaigns.id, campaign.id))
  return n
}

/** Moves a draft or scheduled campaign into sending. Returns false if another worker already started it. */
export async function startCampaign(id: number) {
  const [claimed] = await db
    .update(newsletterCampaigns)
    .set({ status: "sending", startedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(newsletterCampaigns.id, id), inArray(newsletterCampaigns.status, ["draft", "scheduled"])))
    .returning()
  if (!claimed) return false
  await materializeRecipients(claimed)
  return true
}

function isPermanentFailure(err: unknown) {
  const e = err as { responseCode?: number; code?: string; message?: string }
  if (typeof e?.responseCode === "number" && e.responseCode >= 550 && e.responseCode < 560) return true
  return /user unknown|does not exist|no such user|mailbox unavailable|invalid recipient|recipient address rejected/i.test(e?.message ?? "")
}

export type QueueResult = { started: number; sent: number; failed: number; bounced: number; deferred: boolean; completed: number }

/**
 * Sends queued newsletter emails within a time budget, throttled between
 * messages and capped per rolling 24 hours so the SMTP provider is never
 * pushed past its limits. Safe to run concurrently: rows are claimed with
 * SKIP LOCKED.
 */
export async function processNewsletterQueue(opts: { budgetMs?: number; maxSends?: number } = {}): Promise<QueueResult> {
  const deadline = Date.now() + (opts.budgetMs ?? 240_000)
  const result: QueueResult = { started: 0, sent: 0, failed: 0, bounced: 0, deferred: false, completed: 0 }

  const due = await db
    .select({ id: newsletterCampaigns.id })
    .from(newsletterCampaigns)
    .where(and(eq(newsletterCampaigns.status, "scheduled"), sql`${newsletterCampaigns.scheduledAt} <= now()`))
  for (const c of due) if (await startCampaign(c.id)) result.started++

  // Rows left "processing" by a crashed run go back to the queue.
  await db.execute(sql`UPDATE newsletter_recipients SET status = 'queued' WHERE status = 'processing' AND next_attempt_at < now() - interval '15 minutes'`)

  const [{ sentToday }] = await db
    .select({ sentToday: sql<number>`count(*)::int` })
    .from(newsletterRecipients)
    .where(sql`${newsletterRecipients.sentAt} > now() - interval '24 hours'`)
  let allowance = Math.max(0, dailySendLimit() - sentToday)
  if (opts.maxSends != null) allowance = Math.min(allowance, opts.maxSends)

  const campaigns = new Map<number, Campaign>()
  while (allowance > 0 && Date.now() < deadline) {
    const batchSize = Math.min(20, allowance)
    const claimed = (await db.execute(sql`
      UPDATE newsletter_recipients SET status = 'processing', attempts = attempts + 1, next_attempt_at = now()
      WHERE id IN (
        SELECT r.id FROM newsletter_recipients r
        JOIN newsletter_campaigns c ON c.id = r.campaign_id AND c.status = 'sending'
        WHERE r.status = 'queued' OR (r.status = 'failed' AND r.attempts < ${MAX_ATTEMPTS} AND r.next_attempt_at <= now())
        ORDER BY r.id LIMIT ${batchSize} FOR UPDATE SKIP LOCKED
      )
      RETURNING id, campaign_id, email, name, token
    `)) as unknown as { rows: { id: number; campaign_id: number; email: string; name: string; token: string }[] }
    const rows = claimed.rows ?? (claimed as unknown as { id: number; campaign_id: number; email: string; name: string; token: string }[])
    if (!rows.length) break

    const blocked = await suppressedEmails()
    for (const r of rows) {
      if (Date.now() >= deadline) {
        await db.update(newsletterRecipients).set({ status: "queued", attempts: sql`${newsletterRecipients.attempts} - 1` }).where(eq(newsletterRecipients.id, r.id))
        continue
      }
      if (blocked.has(lower(r.email))) {
        await db.update(newsletterRecipients).set({ status: "skipped", lastError: "Unsubscribed or suppressed" }).where(eq(newsletterRecipients.id, r.id))
        continue
      }
      let campaign = campaigns.get(r.campaign_id)
      if (!campaign) {
        ;[campaign] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, r.campaign_id)).limit(1)
        if (!campaign) continue
        campaigns.set(campaign.id, campaign)
      }
      const unsub = unsubscribeUrl(r.email, r.id)
      const msg = renderNewsletter(campaign, { name: r.name, token: r.token, unsubscribeUrl: unsub })
      try {
        const ok = await sendEmail({
          to: r.email,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          templateKey: `newsletter:${campaign.id}`,
          headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click", Precedence: "bulk" },
        })
        if (!ok) throw new Error("Email delivery is not configured")
        await db.update(newsletterRecipients).set({ status: "sent", sentAt: new Date(), lastError: null, nextAttemptAt: null }).where(eq(newsletterRecipients.id, r.id))
        result.sent++
        allowance--
      } catch (err) {
        const message = (err instanceof Error ? err.message : String(err)).slice(0, 500)
        if (isPermanentFailure(err)) {
          await db.update(newsletterRecipients).set({ status: "bounced", lastError: message, nextAttemptAt: null }).where(eq(newsletterRecipients.id, r.id))
          await db.insert(emailSuppressions).values({ email: lower(r.email), topic: "all", reason: `Hard bounce: ${message.slice(0, 120)}`, source: "admin" }).onConflictDoNothing()
          result.bounced++
        } else {
          const [row] = await db.select({ attempts: newsletterRecipients.attempts }).from(newsletterRecipients).where(eq(newsletterRecipients.id, r.id))
          const retryInMin = 15 * (row?.attempts ?? 1)
          await db
            .update(newsletterRecipients)
            .set({ status: "failed", lastError: message, nextAttemptAt: sql`now() + make_interval(mins => ${retryInMin})` })
            .where(eq(newsletterRecipients.id, r.id))
          result.failed++
        }
      }
      await new Promise((res) => setTimeout(res, SEND_GAP_MS))
    }
  }
  if (allowance <= 0) result.deferred = true

  // Finish campaigns with nothing left to send or retry.
  const finished = await db.execute(sql`
    UPDATE newsletter_campaigns c SET status = 'sent', completed_at = now(), updated_at = now()
    WHERE c.status = 'sending' AND NOT EXISTS (
      SELECT 1 FROM newsletter_recipients r WHERE r.campaign_id = c.id
      AND (r.status IN ('queued','processing') OR (r.status = 'failed' AND r.attempts < ${MAX_ATTEMPTS}))
    ) RETURNING c.id
  `)
  result.completed = ((finished as unknown as { rows?: unknown[] }).rows ?? (finished as unknown as unknown[])).length
  return result
}

export const RETRY_LIMIT = MAX_ATTEMPTS

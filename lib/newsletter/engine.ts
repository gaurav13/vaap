import "server-only"
import crypto from "crypto"
import sanitizeHtml from "sanitize-html"
import { and, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { emailSuppressions, newsletterCampaigns, newsletterRecipients } from "@/lib/db/schema"
import { sendEmail } from "@/lib/mailer"
import { createToken } from "@/lib/email-tokens"
import { appBaseUrl } from "@/lib/email-templates/service"
import { DEFAULT_CTA_COLOR, HEX_RE, type BlockAlign, type ContentBlock } from "@/lib/newsletter/content"
import { NEWSLETTER_TOPIC, blockedEmails, resolveAudience } from "@/lib/newsletter/audience"

export { NEWSLETTER_TOPIC, describeAudience, resolveAudience } from "@/lib/newsletter/audience"

const MAX_ATTEMPTS = 3
const SEND_GAP_MS = 400
const lower = (s: string | null | undefined) => (s ?? "").trim().toLowerCase()

/** Gmail Workspace SMTP caps relayed mail per rolling day; stay under it unless configured otherwise. */
export function dailySendLimit() {
  const n = Number(process.env.NEWSLETTER_DAILY_LIMIT)
  return Number.isFinite(n) && n > 0 ? n : 450
}

type Campaign = typeof newsletterCampaigns.$inferSelect

// --- Rendering --------------------------------------------------------------

const INK = "#102a36"
const BODY = "#334155"
const BRAND = "#00343a"
const LINK = "#247049"
const MUTED = "#6b7280"

/** Only alignment and colour survive from inline styles; everything else is the template's job. */
export function sanitizeNewsletterHtml(html: string) {
  const colour = [/^#[0-9a-f]{3,6}$/i, /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i]
  const align = [/^(left|right|center|justify)$/]
  const textStyles = { color: colour, "text-align": align }
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "img", "hr", "span", "div", "table", "tbody", "tr", "td", "th"],
    allowedAttributes: { a: ["href", "title"], img: ["src", "alt", "width", "height"], td: ["colspan", "align"], th: ["colspan", "align"], "*": ["style"] },
    allowedStyles: { "*": textStyles },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["https", "http"] },
    // execCommand("foreColor") emits <font color> in some browsers.
    transformTags: {
      font: (_tag, attribs) => {
        const out: Record<string, string> = {}
        if (attribs.color) out.style = `color:${attribs.color}`
        return { tagName: "span", attribs: out }
      },
    },
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

/** Uploaded images are stored as site-relative paths; mail clients need absolute URLs. */
function absolute(base: string, url: string) {
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith("/")) return `${base}${url}`
  return ""
}

/** Prepends email-safe inline styles to every `<tag>`, keeping any alignment/colour the author set. */
function styleTag(html: string, tag: string, base: string) {
  return html.replace(new RegExp(`<${tag}(\\s[^>]*)?>`, "gi"), (_m, attrs: string = "") => {
    const own = attrs.match(/\sstyle="([^"]*)"/)?.[1] ?? ""
    const rest = attrs.replace(/\sstyle="[^"]*"/, "")
    return `<${tag}${rest} style="${base};${own}">`
  })
}

function styleBody(html: string, base: string, token: string | null) {
  let out = sanitizeNewsletterHtml(html)
    .replace(/<a\s([^>]*?)href="([^"]+)"/gi, (_m, pre: string, href: string) => `<a ${pre}href="${esc(trackedUrl(base, token, href.replace(/&amp;/g, "&")))}"`)
    .replace(/<img\s([^>]*?)src="([^"]+)"/gi, (_m, pre: string, src: string) => `<img ${pre}src="${esc(absolute(base, src.replace(/&amp;/g, "&")))}"`)
  out = styleTag(out, "a", `color:${LINK};text-decoration:underline`)
  out = styleTag(out, "img", "display:block;max-width:100%;height:auto;border-radius:8px;margin:8px 0")
  out = styleTag(out, "p", `margin:0 0 16px;font-size:15px;line-height:1.6;color:${BODY}`)
  out = styleTag(out, "div", `font-size:15px;line-height:1.6;color:${BODY}`)
  out = styleTag(out, "li", `margin:0 0 6px;font-size:15px;line-height:1.6;color:${BODY}`)
  out = styleTag(out, "ul", "margin:0 0 16px;padding-left:22px")
  out = styleTag(out, "ol", "margin:0 0 16px;padding-left:22px")
  out = styleTag(out, "h2", `margin:24px 0 12px;font-size:20px;line-height:1.3;color:${INK}`)
  out = styleTag(out, "h3", `margin:20px 0 10px;font-size:17px;line-height:1.3;color:${INK}`)
  out = styleTag(out, "h4", `margin:16px 0 8px;font-size:15px;line-height:1.3;color:${INK}`)
  out = styleTag(out, "blockquote", `margin:16px 0;padding:4px 0 4px 16px;border-left:4px solid ${LINK};color:${MUTED};font-style:italic`)
  out = styleTag(out, "hr", "border:0;border-top:1px solid #e5e7eb;margin:24px 0")
  return out
}

const alignOf = (a: BlockAlign | undefined) => (a === "center" || a === "right" ? a : "left")
const colourOf = (c: string | null | undefined) => (c && HEX_RE.test(c) ? c : DEFAULT_CTA_COLOR)

function button(label: string, url: string, colour: string, align: BlockAlign) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td align="${align}">
<a href="${esc(url)}" style="display:inline-block;background:${colour};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;font-family:Arial,Helvetica,sans-serif">${esc(label)}</a>
</td></tr></table>`
}

function renderBlock(b: ContentBlock, base: string, token: string | null) {
  switch (b.type) {
    case "text":
      return styleBody(b.html, base, token)
    case "heading": {
      const size = b.level === 3 ? 17 : 20
      return `<h${b.level} style="margin:24px 0 12px;font-size:${size}px;line-height:1.3;color:${INK};text-align:${alignOf(b.align)}">${esc(b.text)}</h${b.level}>`
    }
    case "image": {
      const src = absolute(base, b.url)
      if (!src) return ""
      const img = `<img src="${esc(src)}" alt="${esc(b.alt)}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border-radius:8px" />`
      const href = b.href && /^https?:\/\//i.test(b.href) ? trackedUrl(base, token, b.href) : ""
      return `<div style="margin:16px 0">${href ? `<a href="${esc(href)}">${img}</a>` : img}</div>`
    }
    case "button":
      return b.label && /^https?:\/\//i.test(b.url) ? button(b.label, trackedUrl(base, token, b.url), colourOf(b.color), alignOf(b.align)) : ""
    case "divider":
      return `<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0" />`
  }
}

function blocksToText(blocks: ContentBlock[]) {
  return blocks
    .map((b) => {
      if (b.type === "text") return sanitizeHtml(b.html, { allowedTags: [], allowedAttributes: {} }).trim()
      if (b.type === "heading") return b.text.toUpperCase()
      if (b.type === "button" && b.label && b.url) return `${b.label}: ${b.url}`
      if (b.type === "divider") return "----"
      return ""
    })
    .filter(Boolean)
    .join("\n\n")
}

export type RenderableCampaign = Pick<
  Campaign,
  "title" | "subject" | "previewText" | "bannerUrl" | "bodyHtml" | "ctaLabel" | "ctaUrl" | "ctaColor" | "subheading" | "blocks" | "footerHtml" | "isMarketing"
>

/** Builds the branded, mobile-responsive email. A null token renders an untracked preview. */
export function renderNewsletter(c: RenderableCampaign, opts: { name?: string; token?: string | null; unsubscribeUrl?: string } = {}) {
  const base = appBaseUrl()
  const token = opts.token ?? null
  const name = opts.name?.trim() || "VAAP community member"
  const body = c.bodyHtml ? styleBody(c.bodyHtml, base, token) : ""
  const blocks = (c.blocks ?? []).map((b) => renderBlock(b, base, token)).join("\n")
  const cta = c.ctaLabel && c.ctaUrl && /^https?:\/\//i.test(c.ctaUrl) ? button(c.ctaLabel, trackedUrl(base, token, c.ctaUrl), colourOf(c.ctaColor), "left") : ""
  const bannerSrc = c.bannerUrl ? absolute(base, c.bannerUrl) : ""
  const banner = bannerSrc ? `<img src="${esc(bannerSrc)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto" />` : ""
  const pixel = token ? `<img src="${base}/api/newsletter/o?r=${encodeURIComponent(token)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />` : ""
  const footer = c.footerHtml ? styleBody(c.footerHtml, base, token).replace(/font-size:15px/g, "font-size:13px") : ""

  const legal = c.isMarketing
    ? `You are receiving this because you are a VAAP member or subscribed to VAAP updates. ${
        opts.unsubscribeUrl ? `<a href="${esc(opts.unsubscribeUrl)}" style="color:${MUTED}">Unsubscribe</a> from VAAP newsletters and announcements.` : "An unsubscribe link appears here in delivered emails."
      }`
    : "This is a service message about your VAAP account or membership, so it is sent even if you have unsubscribed from newsletters."

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>${esc(c.subject || c.title)}</title>
<style>@media (max-width:620px){.vaap-pad{padding-left:16px!important;padding-right:16px!important}.vaap-h1{font-size:21px!important}}</style></head>
<body style="margin:0;padding:0;background:#eef2f3">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.previewText)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f3"><tr><td align="center" style="padding:24px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif">
<tr><td class="vaap-pad" style="background:${BRAND};padding:18px 24px;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:.5px">VAAP <span style="font-weight:400;opacity:.85">· Virtual Assets Association of Pakistan</span></td></tr>
${banner ? `<tr><td>${banner}</td></tr>` : ""}
<tr><td class="vaap-pad" style="padding:28px 24px 8px">
<h1 class="vaap-h1" style="margin:0 0 ${c.subheading ? "6px" : "16px"};font-size:24px;line-height:1.3;color:${INK}">${esc(c.title)}</h1>
${c.subheading ? `<p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:${MUTED}">${esc(c.subheading)}</p>` : ""}
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BODY}">Dear ${esc(name)},</p>
${body}${blocks}${cta}
</td></tr>
${footer ? `<tr><td class="vaap-pad" style="padding:8px 24px 0">${footer}</td></tr>` : ""}
<tr><td class="vaap-pad" style="padding:16px 24px 24px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:${MUTED}">
${legal}<br/><a href="${base}" style="color:${MUTED}">vaap.org.pk</a>
</td></tr></table>${pixel}
</td></tr></table></body></html>`

  const plain = (h: string) => sanitizeHtml(h, { allowedTags: [], allowedAttributes: {} }).replace(/\n{3,}/g, "\n\n").trim()
  const text = [
    c.title,
    c.subheading,
    `Dear ${name},`,
    c.bodyHtml ? plain(c.bodyHtml) : "",
    blocksToText(c.blocks ?? []),
    c.ctaLabel && c.ctaUrl ? `${c.ctaLabel}: ${c.ctaUrl}` : "",
    c.footerHtml ? plain(c.footerHtml) : "",
    opts.unsubscribeUrl ? `Unsubscribe: ${opts.unsubscribeUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
  return { subject: c.subject || c.title, html, text }
}

function unsubscribeUrl(email: string, recipientId: number) {
  return `${appBaseUrl()}/api/email/unsubscribe?token=${encodeURIComponent(createToken("unsubscribe", email, { topic: NEWSLETTER_TOPIC, id: recipientId, ttlDays: 365 }))}`
}

// --- Queue ------------------------------------------------------------------

/** Snapshots the audience into the recipient queue. Idempotent per campaign + email. */
export async function materializeRecipients(campaign: Campaign) {
  const { recipients, report } = await resolveAudience(campaign.audience, { marketing: campaign.isMarketing })
  for (let i = 0; i < recipients.length; i += 500) {
    const chunk = recipients.slice(i, i + 500)
    await db
      .insert(newsletterRecipients)
      .values(
        chunk.map((c) => ({
          campaignId: campaign.id,
          email: c.email,
          name: c.name,
          isMember: c.isMember,
          segmentLabel: c.statusLabel,
          token: crypto.randomBytes(18).toString("base64url"),
        })),
      )
      .onConflictDoNothing()
  }
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(newsletterRecipients).where(eq(newsletterRecipients.campaignId, campaign.id))
  await db
    .update(newsletterCampaigns)
    .set({
      totalRecipients: n,
      audienceSummary: { label: report.label, matching: report.matching, duplicates: report.duplicates, excluded: report.excludedTotal, final: report.final },
      updatedAt: new Date(),
    })
    .where(eq(newsletterCampaigns.id, campaign.id))
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
 * Sends queued campaign emails within a time budget, throttled between
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

    // Re-checked per batch so an unsubscribe mid-campaign takes effect immediately.
    const [blockedMarketing, blockedService] = await Promise.all([blockedEmails(true), blockedEmails(false)])
    for (const r of rows) {
      if (Date.now() >= deadline) {
        await db.update(newsletterRecipients).set({ status: "queued", attempts: sql`${newsletterRecipients.attempts} - 1` }).where(eq(newsletterRecipients.id, r.id))
        continue
      }
      let campaign = campaigns.get(r.campaign_id)
      if (!campaign) {
        ;[campaign] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, r.campaign_id)).limit(1)
        if (!campaign) continue
        campaigns.set(campaign.id, campaign)
      }
      if ((campaign.isMarketing ? blockedMarketing : blockedService).has(lower(r.email))) {
        await db.update(newsletterRecipients).set({ status: "skipped", lastError: "Unsubscribed or suppressed" }).where(eq(newsletterRecipients.id, r.id))
        continue
      }
      const unsub = campaign.isMarketing ? unsubscribeUrl(r.email, r.id) : undefined
      const msg = renderNewsletter(campaign, { name: r.name, token: r.token, unsubscribeUrl: unsub })
      try {
        const ok = await sendEmail({
          to: r.email,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          templateKey: `${campaign.kind === "custom" ? "custom-email" : "newsletter"}:${campaign.id}`,
          headers: unsub ? { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click", Precedence: "bulk" } : undefined,
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

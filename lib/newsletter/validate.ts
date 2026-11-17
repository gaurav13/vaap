import "server-only"
import { sanitizeNewsletterHtml } from "@/lib/newsletter/engine"
import { DEFAULT_CTA_COLOR, HEX_RE, type BlockAlign, type CampaignContent, type ContentBlock } from "@/lib/newsletter/content"

const URL_RE = /^https?:\/\/\S+$/i
const MAX_BLOCKS = 40

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max)
const align = (v: unknown): BlockAlign => (v === "center" || v === "right" ? v : "left")
const colour = (v: unknown) => (typeof v === "string" && HEX_RE.test(v) ? v : DEFAULT_CTA_COLOR)
const imageUrl = (v: unknown) => {
  const s = str(v, 1000)
  return URL_RE.test(s) || s.startsWith("/") ? s : ""
}

function normalizeBlocks(raw: unknown, forPreview: boolean): ContentBlock[] {
  if (!Array.isArray(raw)) return []
  if (raw.length > MAX_BLOCKS) throw new Error(`Use at most ${MAX_BLOCKS} content blocks.`)
  const out: ContentBlock[] = []
  for (const b of raw as Record<string, unknown>[]) {
    const id = str(b?.id, 40) || Math.random().toString(36).slice(2, 10)
    if (b?.type === "text") {
      const html = sanitizeNewsletterHtml(String(b.html ?? ""))
      if (html.replace(/<[^>]*>/g, "").trim() || /<img/i.test(html)) out.push({ id, type: "text", html })
    } else if (b?.type === "heading") {
      const text = str(b.text, 200)
      if (text) out.push({ id, type: "heading", text, level: b.level === 3 ? 3 : 2, align: align(b.align) })
    } else if (b?.type === "image") {
      const url = imageUrl(b.url)
      const href = str(b.href, 1000)
      if (href && !URL_RE.test(href) && !forPreview) throw new Error("Image links must start with http:// or https://")
      if (url) out.push({ id, type: "image", url, alt: str(b.alt, 200), href: URL_RE.test(href) ? href : "" })
    } else if (b?.type === "button") {
      const label = str(b.label, 80)
      const url = str(b.url, 1000)
      if (!label && !url) continue
      if (!forPreview && (!label || !URL_RE.test(url))) throw new Error("Every button needs a label and a link starting with https://")
      out.push({ id, type: "button", label, url, color: colour(b.color), align: align(b.align) })
    } else if (b?.type === "divider") {
      out.push({ id, type: "divider" })
    }
  }
  return out
}

/** Validates and sanitizes composer input. Preview mode is lenient so half-written drafts still render. */
export function normalizeContent(c: Partial<CampaignContent>, opts: { forPreview?: boolean } = {}) {
  const forPreview = Boolean(opts.forPreview)
  const title = str(c.title, 200)
  const subject = str(c.subject, 200)
  const ctaUrl = str(c.ctaUrl, 1000)
  const ctaLabel = str(c.ctaLabel, 80)
  const bannerUrl = imageUrl(c.bannerUrl)
  if (!forPreview) {
    if (!title) throw new Error("Add a title.")
    if (ctaUrl && !URL_RE.test(ctaUrl)) throw new Error("The main button link must start with http:// or https://")
    if (ctaLabel && !ctaUrl) throw new Error("Add a link for the main button, or clear its label.")
    if (c.bannerUrl && !bannerUrl) throw new Error("The banner image must be an uploaded image or an https:// URL.")
  }
  return {
    title: title || "Untitled email",
    subject: subject || title || "Untitled email",
    previewText: str(c.previewText, 300),
    subheading: str(c.subheading, 300),
    bannerUrl: bannerUrl || null,
    bodyHtml: sanitizeNewsletterHtml(String(c.bodyHtml ?? "")),
    blocks: normalizeBlocks(c.blocks, forPreview),
    ctaLabel: ctaLabel || null,
    ctaUrl: URL_RE.test(ctaUrl) ? ctaUrl : null,
    ctaColor: colour(c.ctaColor),
    footerHtml: sanitizeNewsletterHtml(String(c.footerHtml ?? "")),
  }
}

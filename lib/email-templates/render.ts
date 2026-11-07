// Pure renderer shared by live sends and the admin preview, so what admins
// preview is byte-for-byte what recipients receive. Client-safe.

import { DEFAULT_ACCENT, DEFAULT_HEADER_LABEL, type EmailContent } from "./registry"

type RenderOptions = {
  /** Absolute site origin used to turn paths like /dashboard into full links. */
  baseUrl?: string
  supportEmail: string
  /** Marketing emails only: adds an unsubscribe link to the footer. */
  unsubscribeUrl?: string
}

const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function interpolate(template: string, vars: Record<string, string | undefined>) {
  return template.replace(VAR_PATTERN, (_, name: string) => vars[name] ?? "")
}

/** A paragraph that references a variable with no value is dropped entirely. */
function referencesEmptyVar(template: string, vars: Record<string, string | undefined>) {
  for (const match of template.matchAll(VAR_PATTERN)) {
    if (!vars[match[1]]?.trim()) return true
  }
  return false
}

function safeColor(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_ACCENT
}

function toAbsolute(url: string, baseUrl?: string) {
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed
  if (trimmed.startsWith("/") && baseUrl) return `${baseUrl.replace(/\/$/, "")}${trimmed}`
  return trimmed.startsWith("/") ? trimmed : ""
}

/** Escapes text, then applies the small formatting subset: **bold** and [label](url). */
function formatInline(text: string, accent: string) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g,
      `<a href="$2" style="color:${accent};word-break:break-all">$1</a>`,
    )
}

function stripInline(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => (label === url ? url : `${label} (${url})`))
}

export function splitParagraphs(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function renderEmail(content: EmailContent, vars: Record<string, string | undefined>, opts: RenderOptions) {
  const accent = safeColor(content.accentColor)
  const headerLabel = content.headerLabel.trim() || DEFAULT_HEADER_LABEL
  const subject = interpolate(content.subject, vars).replace(/\s+/g, " ").trim()
  const heading = interpolate(content.heading, vars)
  const paragraphs = splitParagraphs(content.body)
    .filter((p) => !referencesEmptyVar(p, vars))
    .map((p) => interpolate(p, vars))
  const ctaLabel = interpolate(content.ctaLabel, vars).trim()
  const ctaUrl = toAbsolute(interpolate(content.ctaUrl, vars), opts.baseUrl)
  const footnote = referencesEmptyVar(content.footnote, vars) ? "" : interpolate(content.footnote, vars).trim()
  const support = escapeHtml(opts.supportEmail)

  const bodyHtml = paragraphs
    .map(
      (p) =>
        `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#1f2937">${formatInline(p, accent).replace(/\n/g, "<br>")}</p>`,
    )
    .join("")
  const button =
    ctaLabel && ctaUrl
      ? `<p style="margin:8px 0 24px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600">${escapeHtml(ctaLabel)}</a></p>`
      : ""
  const foot = footnote
    ? `<p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">${formatInline(footnote, accent)}</p>`
    : ""

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
    <div style="border-bottom:2px solid ${accent};padding-bottom:12px;margin-bottom:20px">
      <span style="font-size:13px;font-weight:700;letter-spacing:.5px;color:${accent};text-transform:uppercase">${escapeHtml(headerLabel)}</span>
    </div>
    <h1 style="font-size:20px;margin:0 0 16px;color:${accent}">${escapeHtml(heading)}</h1>
    ${bodyHtml}
    ${button}
    ${foot}
    <p style="font-size:12px;line-height:1.6;color:#9ca3af;margin:24px 0 0;border-top:1px solid #e5e7eb;padding-top:16px">
      This is an automated message from the Virtual Asset Industry Alliance of Pakistan.
      Questions? Reach us at <a href="mailto:${support}" style="color:${accent}">${support}</a>.${
        opts.unsubscribeUrl
          ? `<br><a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline">Unsubscribe from these emails</a>`
          : ""
      }
    </p>
  </div>`

  const text = [
    heading,
    "",
    ...paragraphs.flatMap((p) => [stripInline(p), ""]),
    ctaLabel && ctaUrl ? `${ctaLabel}: ${ctaUrl}` : "",
    footnote ? stripInline(footnote) : "",
    "",
    `— Virtual Asset Industry Alliance of Pakistan · ${opts.supportEmail}`,
    opts.unsubscribeUrl ? `Unsubscribe: ${opts.unsubscribeUrl}` : "",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n")

  return { subject, html, text }
}

import { Marked, type Tokens } from "marked"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function safeHref(href: string) {
  const h = href.trim()
  if ((h.startsWith("/") && !h.startsWith("//")) || h.startsWith("#")) return h
  try {
    const url = new URL(h)
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

// Raw HTML in the source (including anything a model is tricked into emitting)
// is shown as text, never executed; links are limited to safe schemes.
const md = new Marked({ gfm: true, breaks: true, async: false })
md.use({
  renderer: {
    html(token: Tokens.HTML | Tokens.Tag) {
      return escapeHtml(token.text)
    },
    image(token: Tokens.Image) {
      return escapeHtml(token.text)
    },
    link(token: Tokens.Link) {
      const text = this.parser.parseInline(token.tokens)
      const href = safeHref(token.href)
      if (!href) return text
      const external = /^https?:/i.test(href)
      return `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`
    },
    heading(token: Tokens.Heading) {
      const level = Math.min(Math.max(token.depth, 2), 4)
      return `<h${level}>${this.parser.parseInline(token.tokens)}</h${level}>\n`
    },
  },
})

/** Markdown (or plain text) to sanitized HTML. Safe to use on the client. */
export function renderSafeMarkdown(value: string | null | undefined) {
  const text = (value ?? "").trim()
  if (!text) return ""
  return md.parse(text) as string
}

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "blockquote",
])

const VOID_TAGS = new Set(["br", "img"])

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ""
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : ""
    })
    .replace(/&colon;/gi, ":")
    .replace(/&sol;/gi, "/")
    .replace(/&amp;/gi, "&")
}

function safeUrl(raw: string, kind: "href" | "src") {
  const decoded = decodeEntities(raw).replace(/[\u0000-\u001F\u007F\s]+/g, "")
  const lower = decoded.toLowerCase()
  if (kind === "src") {
    return lower.startsWith("https://") ? decoded : null
  }
  if (lower.startsWith("https://") || lower.startsWith("http://") || lower.startsWith("mailto:")) return decoded
  if (decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.startsWith("/\\")) return decoded
  return null
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

function parseAttrs(source: string) {
  const attrs: Record<string, string> = {}
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) {
    const name = match[1].toLowerCase()
    if (name.startsWith("on") || name === "style" || name === "srcset") continue
    attrs[name] = match[2] ?? match[3] ?? match[4] ?? ""
  }
  return attrs
}

function sanitizeAttrs(tag: string, source: string) {
  const attrs = parseAttrs(source)
  const parts: string[] = []
  if (tag === "a" && attrs.href) {
    const href = safeUrl(attrs.href, "href")
    if (href) parts.push(` href="${escapeAttr(href)}" rel="noopener noreferrer"`)
  }
  if (tag === "img" && attrs.src) {
    const src = safeUrl(attrs.src, "src")
    if (src) parts.push(` src="${escapeAttr(src)}"`)
    if (attrs.alt) parts.push(` alt="${escapeAttr(attrs.alt.slice(0, 200))}"`)
  }
  return parts.join("")
}

function stripDangerousBlocks(html: string) {
  let current = html.replace(/\u0000/g, "")
  const block = /<\s*(script|style|iframe|object|embed|svg|math|noscript|template|form)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi
  let previous = ""
  while (current !== previous) {
    previous = current
    current = current.replace(block, "")
  }
  return current.replace(/<\s*(script|style|iframe|object|embed|svg|math|noscript|template|form)\b[^>]*\/?\s*>/gi, "")
}

/** Allow a small set of formatting tags and safe links/images. Drops scripts and event handlers. */
export function sanitizeRichHtml(input: string) {
  const source = stripDangerousBlocks(input)
  return source.replace(/<\/?\s*([a-zA-Z0-9]+)([^>]*)>/g, (full, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ""
    if (full.startsWith("</")) return VOID_TAGS.has(tag) ? "" : `</${tag}>`
    const attrs = sanitizeAttrs(tag, rawAttrs)
    if (VOID_TAGS.has(tag)) return `<${tag}${attrs}>`
    return `<${tag}${attrs}>`
  })
}

export function plainTextToHtml(input: string) {
  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("")
}

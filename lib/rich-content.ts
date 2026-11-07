import { marked } from "marked"
import sanitizeHtml from "sanitize-html"
import { looksLikeMarkdown } from "@/lib/rich-text-plain"

const HTML_TAG = /<\/?(p|br|div|span|strong|b|em|i|u|s|h[1-6]|ul|ol|li|a|img|blockquote|hr|pre|code|table|mark)\b[^>]*>/i
const SIMPLE_HTML_ONLY = /^(?:\s|<\/?(?:p|br|div|span)\b[^>]*>|[^<])*$/i
const URL_IN_TEXT = /\b((?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)\]])/gi

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "mark",
  "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a", "img", "hr", "code", "pre",
  "table", "thead", "tbody", "tr", "th", "td",
]

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
}

/** Text pasted as plain <p>/<br> (typical for ChatGPT copies) is turned back into its Markdown source. */
function simpleHtmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div)>\s*/gi, "\n\n")
      .replace(/<[^>]+>/g, ""),
  ).replace(/\n{3,}/g, "\n\n")
}

function inlineMarkdown(text: string) {
  return text
    .replace(/\*\*(?=\S)([^*]+?)(?<=\S)\*\*/g, "<strong>$1</strong>")
    .replace(/__(?=\S)([^_]+?)(?<=\S)__/g, "<strong>$1</strong>")
    .replace(/==(?=\S)([^=]+?)(?<=\S)==/g, "<mark>$1</mark>")
    .replace(/(^|[\s(>])\*(?=\S)([^*\n]+?)(?<=\S)\*(?=[\s).,;:!?<]|$)/g, "$1<em>$2</em>")
}

/** Fix Markdown left inside real rich-text HTML (bold markers, "## " headings, bare URLs). */
function repairHtml(html: string) {
  let out = html.replace(
    /<p\b[^>]*>\s*(#{1,6})\s+([\s\S]*?)<\/p>/gi,
    (_, hashes: string, body: string) => {
      const level = Math.min(Math.max(hashes.length, 2), 4)
      return `<h${level}>${body.replace(/\s*#+\s*$/, "")}</h${level}>`
    },
  )
  let insideLink = 0
  out = out
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part.startsWith("<")) {
        if (/^<a\b/i.test(part)) insideLink++
        else if (/^<\/a>/i.test(part)) insideLink = Math.max(0, insideLink - 1)
        return part
      }
      let text = inlineMarkdown(part)
      if (!insideLink) {
        text = text.replace(URL_IN_TEXT, (url) => {
          const href = url.startsWith("www.") ? `https://${url}` : url
          return `<a href="${href}">${url}</a>`
        })
      }
      return text
    })
    .join("")
  return out
}

function markdownToHtml(source: string) {
  const normalized = source
    .replace(/\r\n?/g, "\n")
    .replace(/^[ \t]*[•·▪●◦]\s*/gm, "- ")
    .replace(/^([ \t]*)[-–](?=\p{L})/gmu, "$1- ")
    .replace(/==(?=\S)([^=\n]+?)(?<=\S)==/g, "<mark>$1</mark>")
  return marked.parse(normalized, { gfm: true, breaks: true, async: false }) as string
}

function sanitize(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: {
      h1: "h2",
      h5: "h4",
      h6: "h4",
      b: "strong",
      i: "em",
      a: (tagName, attribs) => {
        const href = (attribs.href ?? "").trim()
        const attrs: Record<string, string> = { href }
        if (/^https?:\/\//i.test(href)) {
          attrs.target = "_blank"
          attrs.rel = "noopener noreferrer"
        }
        return { tagName, attribs: attrs }
      },
    },
    exclusiveFilter: (frame) =>
      (frame.tag === "p" || frame.tag === "li") && !frame.text.trim() && !frame.mediaChildren.length,
  })
}

/**
 * Turns any stored content (plain text, Markdown from ChatGPT, or rich-text HTML
 * from Word/Docs/the editor) into clean, safe HTML for display. Works on content
 * already in the database, so nothing needs migrating.
 */
export function renderRichContent(value: string | null | undefined) {
  const source = (value ?? "").trim()
  if (!source) return ""
  if (!HTML_TAG.test(source)) return sanitize(markdownToHtml(source))
  if (SIMPLE_HTML_ONLY.test(source)) {
    const text = simpleHtmlToText(source)
    if (looksLikeMarkdown(text)) return sanitize(markdownToHtml(text))
  }
  return sanitize(repairHtml(source))
}

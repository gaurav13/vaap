import "server-only"

import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { aiKnowledgeChunks, aiKnowledgeSources } from "@/lib/db/schema"

export const KNOWLEDGE_LIMITS = {
  maxFileBytes: 8 * 1024 * 1024,
  maxUrlBytes: 3 * 1024 * 1024,
  maxChars: 400_000,
  chunkChars: 1200,
  chunkOverlap: 150,
}

export const KNOWLEDGE_CATEGORIES = [
  "general",
  "membership",
  "events",
  "governance",
  "blockchain",
  "regulatory",
  "business",
  "support",
] as const

function normalize(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim()
    .slice(0, KNOWLEDGE_LIMITS.maxChars)
}

export function htmlToText(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? ""
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
  return { title: htmlToPlainTitle(title), text: normalize(body) }
}

const htmlToPlainTitle = (t: string) => t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 200)

function isPrivateAddress(ip: string) {
  if (ip.includes(":")) {
    const v = ip.toLowerCase()
    if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7))
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")
  }
  const [a, b] = ip.split(".").map(Number)
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  )
}

async function assertPublicUrl(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error("Enter a valid URL.")
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http and https URLs are allowed.")
  const host = url.hostname
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => [])
  if (addresses.length === 0) throw new Error("That website could not be reached.")
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error("That address is not allowed.")
  return url
}

export async function readUrl(raw: string) {
  let url = await assertPublicUrl(raw)
  let res: Response | null = null
  for (let hop = 0; hop < 4; hop++) {
    res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { "user-agent": "VAAP-Knowledge-Reader/1.0", accept: "text/html,text/plain" },
    })
    const next = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null
    if (!next) break
    url = await assertPublicUrl(new URL(next, url).toString())
  }
  if (!res || !res.ok) throw new Error(`The page returned an error (${res?.status ?? "no response"}).`)
  const type = res.headers.get("content-type") ?? ""
  if (!/text\/html|text\/plain|application\/xhtml/.test(type)) throw new Error("Only web pages (HTML or plain text) can be read.")
  const buf = await res.arrayBuffer()
  if (buf.byteLength > KNOWLEDGE_LIMITS.maxUrlBytes) throw new Error("That page is too large to read.")
  const raw2 = new TextDecoder().decode(buf)
  if (type.includes("text/plain")) return { title: url.hostname, text: normalize(raw2), url: url.toString() }
  const { title, text } = htmlToText(raw2)
  return { title: title || url.hostname, text, url: url.toString() }
}

export async function readDocument(file: File) {
  if (file.size > KNOWLEDGE_LIMITS.maxFileBytes) throw new Error("Files must be 8 MB or smaller.")
  const name = file.name.toLowerCase()
  const buf = Buffer.from(await file.arrayBuffer())
  if (name.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(buf))
    const { text } = await extractText(pdf, { mergePages: true })
    return { kind: "pdf" as const, text: normalize(text) }
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth")
    const { value } = await mammoth.extractRawText({ buffer: buf })
    return { kind: "docx" as const, text: normalize(value) }
  }
  if (name.endsWith(".txt") || name.endsWith(".md")) return { kind: "text" as const, text: normalize(buf.toString("utf8")) }
  throw new Error("Upload a PDF, DOCX, TXT or MD file.")
}

export function chunkText(text: string) {
  const { chunkChars, chunkOverlap } = KNOWLEDGE_LIMITS
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ""
  const push = () => {
    if (current.trim()) chunks.push(current.trim())
    current = current.slice(-chunkOverlap)
  }
  for (const p of paragraphs) {
    if (p.length > chunkChars) {
      for (let i = 0; i < p.length; i += chunkChars - chunkOverlap) {
        if (current.length + Math.min(chunkChars, p.length - i) > chunkChars) push()
        current += (current ? " " : "") + p.slice(i, i + chunkChars)
      }
      continue
    }
    if (current.length + p.length + 2 > chunkChars) push()
    current += (current ? "\n\n" : "") + p
  }
  if (current.trim() && (chunks.length === 0 || !chunks[chunks.length - 1].endsWith(current.trim()))) chunks.push(current.trim())
  return chunks
}

export async function replaceChunks(sourceId: number, text: string) {
  const chunks = chunkText(text)
  await db.delete(aiKnowledgeChunks).where(eq(aiKnowledgeChunks.sourceId, sourceId))
  for (let i = 0; i < chunks.length; i += 200) {
    await db
      .insert(aiKnowledgeChunks)
      .values(chunks.slice(i, i + 200).map((content, j) => ({ sourceId, position: i + j, content })))
  }
  return chunks.length
}

function toOrQuery(query: string) {
  const terms = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1)
    .slice(0, 12)
  return [...new Set(terms)].map((t) => `${t}:*`).join(" | ")
}

export async function searchKnowledge(query: string, category?: string, limit = 4) {
  const tsq = toOrQuery(query)
  if (!tsq) return []
  const rows = await db
    .select({
      title: aiKnowledgeSources.title,
      sourceUrl: aiKnowledgeSources.sourceUrl,
      category: aiKnowledgeSources.category,
      content: aiKnowledgeChunks.content,
      rank: sql<number>`ts_rank(to_tsvector('simple', ${aiKnowledgeChunks.content}), to_tsquery('simple', ${tsq}))`,
    })
    .from(aiKnowledgeChunks)
    .innerJoin(aiKnowledgeSources, eq(aiKnowledgeSources.id, aiKnowledgeChunks.sourceId))
    .where(
      and(
        eq(aiKnowledgeSources.active, true),
        category ? eq(aiKnowledgeSources.category, category) : undefined,
        sql`to_tsvector('simple', ${aiKnowledgeChunks.content}) @@ to_tsquery('simple', ${tsq})`,
      ),
    )
    .orderBy(sql`5 desc`)
    .limit(limit)
  return rows
}

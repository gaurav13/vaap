import "server-only"

import { randomUUID } from "node:crypto"
import { generateText, Output } from "ai"
import { z } from "zod"
import { pool } from "@/lib/db"
import { PRICING_VERSION, costMicroUsd } from "./config"

export type ApprovedCorrection = {
  id: number
  question: string
  answer: string
  topic: string
  updatedAt: Date
  score: number
}

// Paraphrase generation runs once per approval, so the cheapest approved model is enough.
const INDEX_MODEL = "openai/gpt-4.1-nano"

const STOP = new Set([
  "the", "and", "for", "what", "how", "can", "you", "are", "does", "vaap", "with", "this", "that", "who", "why", "when",
  "will", "get", "have", "has", "about", "your", "from", "should", "would", "could", "my", "our", "any", "there",
  "kya", "hai", "hain", "mein", "main", "aur", "kaise", "kyun", "kab", "liye", "karna", "kar", "sakta", "sakti", "mujhe", "meri", "mera", "hum", "yeh", "woh", "bhi", "koi",
  "کیا", "ہے", "ہیں", "میں", "اور", "کے", "کی", "کا", "کو", "سے", "یہ", "وہ", "بھی", "کیسے", "کیوں",
])

function terms(text: string) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .normalize("NFKC")
        .split(/[^\p{L}\p{N}]+/u)
        .filter((t) => t.length > 1 && !STOP.has(t) && !(t.length < 3 && /^[a-z0-9]+$/.test(t))),
    ),
  ]
}

// Latin words are compared by stem so "member"/"members"/"membership" and "benefit"/"benefits" line up.
function stem(t: string) {
  if (!/^[a-z0-9]+$/.test(t) || t.length <= 4) return t
  return t.replace(/(ships|ship|ings|ing|ies|ied|ers|er|es|ed|s)$/, "").slice(0, 7)
}

/**
 * Asks the model for alternative phrasings of an approved question in English, Urdu and Roman Urdu.
 * These are stored with the correction so later questions with different wording can still find it.
 */
export async function generateCorrectionVariants(question: string, answer: string, keywords: string) {
  const { output, usage } = await generateText({
    model: INDEX_MODEL,
    maxOutputTokens: 900,
    output: Output.object({
      schema: z.object({
        english: z.array(z.string()).max(10),
        urdu: z.array(z.string()).max(5),
        romanUrdu: z.array(z.string()).max(5),
        concepts: z.array(z.string()).max(15),
      }),
    }),
    prompt: `An administrator approved this answer for the VAAP (Virtual Asset Industry Alliance of Pakistan) assistant.

Question: ${question}
Keywords: ${keywords || "none"}
Answer: ${answer.slice(0, 2000)}

List the different ways real users might ask for this same information:
- english: up to 10 English questions with different wording and perspective (for example "benefits for corporate members" vs "why should my company join").
- urdu: up to 5 questions in Urdu script.
- romanUrdu: up to 5 questions in Roman Urdu.
- concepts: up to 15 single words or short phrases (synonyms, entities, categories) that identify this topic.
Only include phrasings that the answer actually answers.`,
  })

  const input = usage.inputTokens ?? 0
  const out = usage.outputTokens ?? 0
  const requestId = randomUUID()
  await pool
    .query(
      `insert into ai_usage_logs ("requestId", "sessionId", "messageId", model, "inputTokens", "outputTokens", "costMicroUsd", "pricingVersion", status, topic, question, provider)
       values ($1, 'system:correction-index', $1, $2, $3, $4, $5, $6, 'ok', 'correction-index', '', 'gateway')`,
      [requestId, INDEX_MODEL, input, out, costMicroUsd(INDEX_MODEL, input, 0, out), PRICING_VERSION],
    )
    .catch((e) => console.error("[assistant] index usage log failed:", (e as Error).message))

  return [...output.english, ...output.urdu, ...output.romanUrdu, ...output.concepts]
    .map((v) => v.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000)
}

/** Regenerates paraphrases for a correction. Failures leave the existing index in place. */
export async function indexCorrection(id: number) {
  const { rows } = await pool.query<{ question: string; correctedAnswer: string; keywords: string }>(
    `select question, "correctedAnswer", keywords from ai_answer_corrections where id = $1`,
    [id],
  )
  if (!rows[0]) return false
  try {
    const variants = await generateCorrectionVariants(rows[0].question, rows[0].correctedAnswer, rows[0].keywords)
    await pool.query(`update ai_answer_corrections set variants = $2, "indexedAt" = now() where id = $1`, [id, variants])
    return true
  } catch (e) {
    console.error("[assistant] correction indexing failed:", (e as Error).message)
    return false
  }
}

/**
 * Finds approved corrections that ask for the same information as the query.
 * Each correction is scored against its question, keywords and stored English / Urdu / Roman Urdu
 * paraphrases, so differently worded questions still match. The best candidates are handed to the
 * model, which is instructed to use one only when the intent genuinely fits.
 */
export async function searchCorrections(query: string, limit = 2): Promise<ApprovedCorrection[]> {
  const qTerms = terms(query).map(stem)
  if (qTerms.length === 0) return []
  const { rows } = await pool.query<{
    id: number
    question: string
    correctedAnswer: string
    keywords: string
    variants: string
    topic: string
    updatedAt: Date
  }>(
    `select id, question, "correctedAnswer", keywords, variants, topic, "updatedAt"
     from ai_answer_corrections where status = 'approved'
     order by "updatedAt" desc limit 500`,
  )

  const scored = rows.map((r) => {
    const phrasings = [r.question, ...r.variants.split("\n")].filter(Boolean)
    const conceptTerms = new Set(terms(`${r.keywords} ${r.variants}`).map(stem))
    // Best single phrasing: share of the query's terms it covers.
    let best = 0
    for (const p of phrasings) {
      const pTerms = new Set(terms(p).map(stem))
      if (pTerms.size === 0) continue
      const hits = qTerms.filter((t) => pTerms.has(t)).length
      const coverage = hits / Math.max(qTerms.length, 1)
      const precision = hits / pTerms.size
      best = Math.max(best, coverage * 0.7 + precision * 0.3)
    }
    const conceptHits = qTerms.filter((t) => conceptTerms.has(t)).length / qTerms.length
    return { r, score: best * 0.75 + conceptHits * 0.25 }
  })

  return scored
    .filter((s) => s.score >= 0.3)
    .sort((a, b) => b.score - a.score || b.r.updatedAt.getTime() - a.r.updatedAt.getTime())
    .slice(0, limit)
    .map(({ r, score }) => ({
      id: r.id,
      question: r.question,
      answer: r.correctedAnswer,
      topic: r.topic,
      updatedAt: r.updatedAt,
      score: Math.round(score * 100) / 100,
    }))
}

/** Counts how often an approved correction was handed to the model. */
export async function markCorrectionsUsed(ids: number[]) {
  if (ids.length === 0) return
  await pool
    .query(`update ai_answer_corrections set "useCount" = "useCount" + 1, "lastUsedAt" = now() where id = any($1::int[])`, [ids])
    .catch(() => {})
}

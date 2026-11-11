import "server-only"

import { pool } from "@/lib/db"

export type ApprovedCorrection = {
  id: number
  question: string
  answer: string
  topic: string
  updatedAt: Date
  score: number
}

const STOP = new Set(["the", "and", "for", "what", "how", "can", "you", "are", "is", "do", "does", "vaap", "kya", "hai", "mein", "ki", "ka", "ke"])

function terms(text: string) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((t) => t.length > 2 && !STOP.has(t)),
    ),
  ].slice(0, 14)
}

/**
 * Finds approved corrections whose question means roughly the same thing.
 * Uses English stemming (so "renew"/"renewal" match) over the question and
 * admin-supplied keywords, then requires enough term overlap that unrelated
 * questions sharing one word are not matched. The model still decides whether
 * the intent, jurisdiction and membership category actually fit.
 */
export async function searchCorrections(query: string, limit = 2): Promise<ApprovedCorrection[]> {
  const words = terms(query)
  if (words.length === 0) return []
  const tsq = words.map((w) => `${w.replace(/[':&|!()\\]/g, "")}:*`).filter((w) => w.length > 2).join(" | ")
  if (!tsq) return []
  const { rows } = await pool.query<{
    id: number
    question: string
    correctedAnswer: string
    keywords: string
    topic: string
    updatedAt: Date
    score: number
  }>(
    `select id, question, "correctedAnswer", keywords, topic, "updatedAt",
       ts_rank(to_tsvector('english', question || ' ' || keywords), to_tsquery('english', $1)) as score
     from ai_answer_corrections
     where status = 'approved'
       and to_tsvector('english', question || ' ' || keywords) @@ to_tsquery('english', $1)
     order by score desc, "updatedAt" desc
     limit 6`,
    [tsq],
  )
  const minOverlap = Math.min(2, words.length)
  return rows
    .filter((r) => {
      const corpus = terms(`${r.question} ${r.keywords}`).join(" ")
      const overlap = words.filter((w) => corpus.includes(w.slice(0, Math.max(4, w.length - 2)))).length
      return overlap >= minOverlap
    })
    .slice(0, limit)
    .map((r) => ({ id: r.id, question: r.question, answer: r.correctedAnswer, topic: r.topic, updatedAt: r.updatedAt, score: Number(r.score) }))
}

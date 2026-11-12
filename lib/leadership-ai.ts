import "server-only"
import { randomUUID } from "node:crypto"
import { generateText, Output } from "ai"
import { z } from "zod"
import { pool } from "@/lib/db"
import { classifyAiError, resolveModel } from "@/lib/ai-assistant/provider"
import { PRICING_VERSION, costMicroUsd } from "@/lib/ai-assistant/config"
import { AI_SECTIONS, type AiSection } from "@/lib/leadership"

const PROFILE_MODEL = "openai/gpt-4.1-mini"

const FACT_LABELS: Record<string, string> = {
  name: "Full name",
  kind: "VAAP leadership group",
  position: "VAAP leadership position",
  title: "Professional title",
  organization: "Organization",
  responsibility: "Responsibilities (as provided)",
  portfolio: "Portfolio (as provided)",
  bio: "Biography notes (as provided)",
  message: "Message to the community (as provided)",
}

const SECTION_RULES: Record<AiSection, string> = {
  summary: "summary: 1-2 sentences (max 45 words), third person, for the leadership directory card.",
  bio: "bio: 2-4 short paragraphs (120-220 words total), third person, formal. Separate paragraphs with a blank line. No headings, no lists.",
  responsibility: "responsibility: one concise sentence (max 35 words) describing their VAAP responsibilities and portfolio.",
  message:
    "message: lightly polish the provided message to the community (grammar, clarity, first person). If no message was provided, return an empty string.",
}

function htmlParagraphs(text: string) {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((p) => `<p>${escape(p)}</p>`)
    .join("")
}

function plain(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Writes the requested profile sections from verified facts only. Nothing is
 * stored here: callers place the result in an editable draft for approval.
 */
export async function generateProfileSections(opts: {
  facts: Record<string, string>
  sections: AiSection[]
  actorId: string
}): Promise<{ sections: Partial<Record<AiSection, string>>; error?: string }> {
  const sections = AI_SECTIONS.map((s) => s.key).filter((k) => opts.sections.includes(k))
  if (sections.length === 0) return { sections: {} }

  const facts = Object.entries(FACT_LABELS)
    .map(([key, label]) => [label, plain(opts.facts[key] ?? "").slice(0, 3000)] as const)
    .filter(([, v]) => v)
    .map(([label, v]) => `- ${label}: ${v}`)
    .join("\n")
  if (!plain(opts.facts.name ?? "")) return { sections: {}, error: "Add the full name before generating." }

  const requestId = randomUUID()
  try {
    const { model, provider } = await resolveModel(PROFILE_MODEL)
    const { output, usage } = await generateText({
      model,
      maxOutputTokens: 1500,
      output: Output.object({
        schema: z.object(Object.fromEntries(sections.map((k) => [k, z.string()])) as Record<string, z.ZodString>),
      }),
      prompt: `You format official leadership profiles for VAAP (Virtual Asset Industry Alliance of Pakistan).

Verified facts submitted by the applicant and confirmed by an administrator:
${facts}

Strict rules:
- Use only the facts above. Never invent or embellish qualifications, degrees, appointments, employers, organizations, awards, years, numbers, quotes or achievements.
- If a fact is missing, leave it out rather than guessing. Do not add placeholders.
- Professional, factual British/Pakistani English. No emojis, no hashtags, no marketing superlatives.
- Refer to the person by their name.

Write these sections:
${sections.map((k) => `- ${SECTION_RULES[k]}`).join("\n")}`,
    })

    const input = usage.inputTokens ?? 0
    const out = usage.outputTokens ?? 0
    await pool
      .query(
        `insert into ai_usage_logs ("requestId", "sessionId", "messageId", model, "inputTokens", "outputTokens", "costMicroUsd", "pricingVersion", status, topic, question, provider)
         values ($1, $2, $1, $3, $4, $5, $6, $7, 'ok', 'leadership-profile', '', $8)`,
        [requestId, `system:leadership-profile:${opts.actorId}`, PROFILE_MODEL, input, out, costMicroUsd(PROFILE_MODEL, input, 0, out), PRICING_VERSION, provider],
      )
      .catch((e) => console.error("[leadership] usage log failed:", (e as Error).message))

    const result: Partial<Record<AiSection, string>> = {}
    for (const key of sections) {
      const text = String((output as Record<string, string>)[key] ?? "").trim()
      result[key] = key === "bio" ? htmlParagraphs(text) : text.replace(/\s+/g, " ")
    }
    return { sections: result }
  } catch (error) {
    const info = classifyAiError(error)
    console.error("[leadership] profile generation failed:", info.code, info.detail)
    return { sections: {}, error: info.userMessage }
  }
}

import { randomUUID } from "node:crypto"
import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream, type UIMessage } from "ai"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { aiUsageLogs } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { ASSISTANT_LANGUAGES, ASSISTANT_MODEL, BUDGET, PRICING, costMicroUsd, type AssistantLanguage } from "@/lib/ai-assistant/config"
import { assistantTools, checkAllowance, systemPrompt } from "@/lib/ai-assistant/server"

export const maxDuration = 30

const SESSION_COOKIE = "vaap_ai_sid"

const LIMIT_COPY = {
  budget:
    "The AI assistant has reached its monthly usage limit. You can still browse membership, events and support pages, or contact VAAP via /support.",
  quota: "You have reached today's question limit for the AI assistant. Please try again tomorrow or visit /support for help.",
}

function textOf(message: UIMessage) {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("")
}

export async function POST(req: Request) {
  let body: { messages?: UIMessage[]; language?: string }
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid request.", { status: 400 })
  }

  const language: AssistantLanguage = ASSISTANT_LANGUAGES.includes(body.language as AssistantLanguage)
    ? (body.language as AssistantLanguage)
    : "en"

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && Array.isArray(m.parts))
    .slice(-BUDGET.maxHistoryMessages)
  const last = messages.at(-1)
  if (!last || last.role !== "user" || !textOf(last).trim() || textOf(last).length > 2000) {
    return new Response("Please enter a question (up to 2000 characters).", { status: 400 })
  }

  const cookieStore = await cookies()
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId || !/^[\w-]{20,64}$/.test(sessionId)) {
    sessionId = randomUUID()
    cookieStore.set(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 30 })
  }

  const session = await getSession().catch(() => null)
  const viewer = session?.user ? { id: session.user.id, name: session.user.name, email: session.user.email } : null

  const allowance = await checkAllowance(viewer?.id ?? null, sessionId)
  if (allowance !== "ok") return new Response(LIMIT_COPY[allowance], { status: 429 })

  const requestId = randomUUID()
  const startedAt = Date.now()
  let toolCalls = 0

  const result = streamText({
    model: ASSISTANT_MODEL,
    system: await systemPrompt(language, viewer),
    messages: await convertToModelMessages(messages),
    tools: assistantTools(viewer),
    stopWhen: isStepCount(4),
    maxOutputTokens: BUDGET.maxOutputTokens,
    onStepFinish: (step) => {
      toolCalls += step.toolCalls?.length ?? 0
    },
    onFinish: async ({ totalUsage }) => {
      const input = totalUsage.inputTokens ?? 0
      const output = totalUsage.outputTokens ?? 0
      const cached = totalUsage.inputTokenDetails?.cacheReadTokens ?? 0
      try {
        await db.insert(aiUsageLogs).values({
          requestId,
          userId: viewer?.id ?? null,
          sessionId,
          model: ASSISTANT_MODEL,
          inputTokens: input,
          outputTokens: output,
          cachedInputTokens: cached,
          reasoningTokens: totalUsage.outputTokenDetails?.reasoningTokens ?? 0,
          toolCalls,
          costMicroUsd: costMicroUsd(input, cached, output),
          pricingVersion: PRICING.version,
          language,
          latencyMs: Date.now() - startedAt,
        })
      } catch (error) {
        console.error("[assistant] usage log failed:", (error as Error).message)
      }
    },
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}

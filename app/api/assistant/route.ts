import { randomUUID } from "node:crypto"
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"
import { cookies } from "next/headers"
import { after } from "next/server"
import { db } from "@/lib/db"
import { aiUsageLogs } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import {
  ASSISTANT_LANGUAGES,
  MAX_HISTORY_MESSAGES,
  MAX_STEPS,
  PRICING_VERSION,
  classifyTopic,
  costMicroUsd,
  modelPrice,
  type AssistantLanguage,
} from "@/lib/ai-assistant/config"
import { getAiSettings } from "@/lib/ai-assistant/settings"
import { checkBudgetAlerts, releaseBudget, reserveBudget } from "@/lib/ai-assistant/budget"
import { reconcileCosts } from "@/lib/ai-assistant/reconcile"
import { markCorrectionsUsed, searchCorrections } from "@/lib/ai-assistant/corrections"
import { assistantTools, freeAnswer, systemPrompt } from "@/lib/ai-assistant/server"
import { consumeQuestion, getUsageState, ipSubject, limitMessage } from "@/lib/ai-assistant/usage-limits"
import type { UsageState, UsageTier } from "@/lib/ai-assistant/config"

export const maxDuration = 30

const SESSION_COOKIE = "vaap_ai_sid"
// Rough upper bound for tool results added to the prompt on each step.
const TOOL_RESULT_TOKENS_PER_STEP = 1500
const UNANSWERED = /(don'?t|do not) have (that|this|any|specific)|could ?n[o']t find|no information|not (sure|available in)|unable to (find|answer)/i

const NOTICES = {
  disabled: "The AI assistant is currently paused. Here is what I found in VAAP's saved answers:",
  budget: "AI answers are paused because this period's AI budget has been reached. Here is what I found in VAAP's saved answers:",
  daily: "You have reached today's AI question limit. Here is what I found in VAAP's saved answers:",
  monthly: "You have reached this month's AI question limit. Here is what I found in VAAP's saved answers:",
  cost: "That question is too long for an AI answer. Please shorten it. Meanwhile, here is what I found in VAAP's saved answers:",
} as const
const STATUS_FOR: Record<keyof typeof NOTICES, string> = {
  disabled: "disabled",
  budget: "blocked_budget",
  daily: "blocked_quota",
  monthly: "blocked_quota",
  cost: "blocked_cost",
}

function textOf(message: UIMessage) {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("")
}

type LogBase = {
  requestId: string
  userId: string | null
  sessionId: string
  conversationId: string | null
  language: AssistantLanguage
  question: string
  topic: string
  tier: UsageTier
}

async function writeLog(base: LogBase, values: Partial<typeof aiUsageLogs.$inferInsert>) {
  try {
    await db.insert(aiUsageLogs).values({ ...base, messageId: base.requestId, model: "", ...values })
  } catch (error) {
    console.error("[assistant] usage log failed:", (error as Error).message)
  }
}

export async function POST(req: Request) {
  let body: { messages?: UIMessage[]; language?: string; conversationId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid request.", { status: 400 })
  }

  const settings = await getAiSettings()
  const requested = ASSISTANT_LANGUAGES.find((l) => l === body.language)
  const language: AssistantLanguage = requested && settings.languages.includes(requested) ? requested : settings.languages[0]

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && Array.isArray(m.parts))
    .slice(-MAX_HISTORY_MESSAGES)
  const last = messages.at(-1)
  const question = last ? textOf(last).trim() : ""
  if (!last || last.role !== "user" || !question || question.length > 2000) {
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
  const requestId = randomUUID()
  const usageCtx = { viewer: viewer ? { id: viewer.id, email: viewer.email } : null, sessionId, ip: ipSubject(req), settings }
  const base: LogBase = {
    requestId,
    userId: viewer?.id ?? null,
    sessionId,
    conversationId: typeof body.conversationId === "string" ? body.conversationId.slice(0, 64) : null,
    language,
    question: question.slice(0, 1000),
    topic: classifyTopic(question),
    tier: viewer ? "registered" : "guest",
  }

  const staticReply = (text: string, metadata: Record<string, unknown>) =>
    createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute({ writer }) {
          writer.write({ type: "start", messageMetadata: { requestId, free: true, ...metadata } })
          writer.write({ type: "text-start", id: requestId })
          writer.write({ type: "text-delta", id: requestId, delta: text })
          writer.write({ type: "text-end", id: requestId })
          writer.write({ type: "finish" })
        },
      }),
    })

  const freeReply = async (reason: keyof typeof NOTICES, usage: UsageState) => {
    const free = await freeAnswer(question, NOTICES[reason])
    await writeLog(base, { status: STATUS_FOR[reason], answered: free.answered, provider: "faq", answer: free.text.slice(0, 8000) })
    return staticReply(free.text, { usage })
  }

  if (!settings.enabled || settings.emergencyShutdown) {
    const usage = await getUsageState(usageCtx)
    base.tier = usage.tier
    return freeReply("disabled", usage)
  }

  // Reserve one question atomically before any paid call, including the correction-search embedding.
  const consumed = await consumeQuestion(usageCtx)
  base.tier = consumed.state.tier
  if (!consumed.ok) {
    const text = limitMessage(consumed.state, consumed.reason)
    await writeLog(base, {
      status: consumed.reason === "spend" ? "blocked_spend" : "blocked_quota",
      answered: false,
      provider: "limit",
      answer: text,
    })
    return staticReply(text, { limited: true, usage: consumed.state })
  }
  const { ticket } = consumed
  const usage = consumed.state

  let basePrompt: string
  let matchedCorrections: Awaited<ReturnType<typeof searchCorrections>>
  try {
    ;[basePrompt, matchedCorrections] = await Promise.all([
      systemPrompt(language, viewer),
      searchCorrections(question, 2).catch(() => []),
    ])
  } catch (error) {
    await ticket.refund()
    throw error
  }
  const system = matchedCorrections.length
    ? `${basePrompt}

Approved VAAP corrections that may match this question (highest priority source, written by VAAP administrators):
${matchedCorrections
  .map((c, i) => `[Correction ${i + 1}] Approved question: ${c.question}\nApproved answer:\n${c.answer.slice(0, 1500)}`)
  .join("\n\n")}

If one of these asks for the same information as the user (even in different words or another language), base your answer on it, translated into the user's language, ahead of any other source. If it only shares words but asks something different, ignore it. If another source contradicts an approved correction, use the correction and tell the user that VAAP staff will confirm the details.`
    : basePrompt
  if (matchedCorrections.length) after(() => markCorrectionsUsed(matchedCorrections.map((c) => c.id)))
  const promptChars = system.length + messages.reduce((n, m) => n + textOf(m).length, 0)
  const price = modelPrice(settings.defaultModel)
  const inputTokensPerStep = Math.ceil(promptChars / 3) + TOOL_RESULT_TOKENS_PER_STEP
  const worstCaseMicroUsd = Math.ceil(
    inputTokensPerStep * MAX_STEPS * price.input + settings.maxOutputTokens * MAX_STEPS * price.output,
  )

  // Requests refused here never reach the model, so the question is given back.
  const refused: keyof typeof NOTICES | null =
    worstCaseMicroUsd > settings.maxCostPerRequestUsd * 1_000_000
      ? "cost"
      : !(await reserveBudget(requestId, worstCaseMicroUsd, settings)).ok
        ? "budget"
        : null
  if (refused) {
    await ticket.refund()
    return freeReply(refused, { ...usage, used: usage.used - 1, remaining: usage.remaining + 1 })
  }

  const startedAt = Date.now()
  let toolCalls = 0
  let knowledgeMissed = false
  let provider = ""
  let servedModel: string = settings.defaultModel
  const generationIds: string[] = []

  const finalize = async (values: Partial<typeof aiUsageLogs.$inferInsert>) => {
    await writeLog(base, {
      model: servedModel,
      provider,
      toolCalls,
      pricingVersion: PRICING_VERSION,
      latencyMs: Date.now() - startedAt,
      generationIds: generationIds.join(","),
      ...values,
    })
    await releaseBudget(requestId)
    after(async () => {
      await checkBudgetAlerts(settings)
      // Generation details are available a few seconds after the response completes.
      await new Promise((r) => setTimeout(r, 5000))
      await reconcileCosts(5).catch(() => {})
    })
  }

  const result = streamText({
    model: settings.defaultModel,
    system,
    messages: await convertToModelMessages(messages),
    tools: assistantTools(viewer),
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: settings.maxOutputTokens,
    providerOptions: settings.fallbackModel ? { gateway: { models: [settings.fallbackModel] } } : undefined,
    onStepFinish: (step) => {
      toolCalls += step.toolCalls?.length ?? 0
      for (const r of step.toolResults ?? []) {
        const output = (r as { toolName?: string; output?: { found?: boolean } }).output
        if ((r as { toolName?: string }).toolName === "searchKnowledge" && output?.found === false) knowledgeMissed = true
      }
      const meta = step.providerMetadata?.gateway as
        | { generationId?: string; routing?: { finalProvider?: string; resolvedProvider?: string } }
        | undefined
      if (meta?.generationId) generationIds.push(meta.generationId)
      provider = meta?.routing?.finalProvider ?? meta?.routing?.resolvedProvider ?? provider
      if (step.response?.modelId) servedModel = step.response.modelId
    },
    onFinish: async ({ totalUsage, text }) => {
      const input = totalUsage.inputTokens ?? 0
      const output = totalUsage.outputTokens ?? 0
      const cached = totalUsage.inputTokenDetails?.cacheReadTokens ?? 0
      await finalize({
        status: "ok",
        inputTokens: input,
        outputTokens: output,
        cachedInputTokens: cached,
        reasoningTokens: totalUsage.outputTokenDetails?.reasoningTokens ?? 0,
        costMicroUsd: costMicroUsd(servedModel, input, cached, output),
        answer: text.slice(0, 8000),
        answered: !(knowledgeMissed && UNANSWERED.test(text)) && !UNANSWERED.test(text.slice(0, 300)),
      })
    },
    onError: async ({ error }) => {
      console.error("[assistant] generation failed:", error instanceof Error ? error.message : error)
      // A technical failure is not the user's fault; give the question back.
      await ticket.refund()
      // Charge the worst case until reconciliation replaces it with the actual gateway cost.
      await finalize({
        status: "error",
        costMicroUsd: generationIds.length ? worstCaseMicroUsd : 0,
        answered: false,
        errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 500),
      })
    },
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      messageMetadata: ({ part }) => (part.type === "start" ? { requestId, usage } : undefined),
      onError: () => "The assistant could not answer right now. Please try again in a moment.",
    }),
  })
}

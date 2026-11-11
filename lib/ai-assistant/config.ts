import { z } from "zod"

export const ASSISTANT_LANGUAGES = ["en", "ur", "roman-ur"] as const
export type AssistantLanguage = (typeof ASSISTANT_LANGUAGES)[number]

// USD per 1M tokens, taken from the Vercel AI Gateway model list (2026-11).
// Estimates use these prices; the actual charge is reconciled from the gateway afterwards.
export const PRICING_VERSION = "gateway-2026-11"
export const MODEL_CATALOG = {
  "openai/gpt-4.1-mini": { label: "GPT-4.1 mini", provider: "OpenAI", input: 0.4, cached: 0.1, output: 1.6 },
  "openai/gpt-4.1-nano": { label: "GPT-4.1 nano", provider: "OpenAI", input: 0.1, cached: 0.03, output: 0.4 },
  "openai/gpt-5-mini": { label: "GPT-5 mini", provider: "OpenAI", input: 0.25, cached: 0.025, output: 2 },
  "google/gemini-2.5-flash": { label: "Gemini 2.5 Flash", provider: "Google", input: 0.3, cached: 0.03, output: 2.5 },
  "google/gemini-3-flash": { label: "Gemini 3 Flash", provider: "Google", input: 0.5, cached: 0.05, output: 3 },
  "anthropic/claude-haiku-4.5": { label: "Claude Haiku 4.5", provider: "Anthropic", input: 1, cached: 0.1, output: 5 },
} as const
export type AssistantModelId = keyof typeof MODEL_CATALOG
export const MODEL_IDS = Object.keys(MODEL_CATALOG) as [AssistantModelId, ...AssistantModelId[]]

export const QUICK_ACTION_KEYS = [
  "membership",
  "events",
  "voting",
  "blockchain",
  "business",
  "regulatory",
] as const
export type QuickActionKey = (typeof QUICK_ACTION_KEYS)[number]

// Steps the model may take per request (tool calls + final answer). Used for worst-case cost.
export const MAX_STEPS = 4
export const MAX_HISTORY_MESSAGES = 12

export const aiSettingsSchema = z
  .object({
    enabled: z.boolean(),
    emergencyShutdown: z.boolean(),
    defaultModel: z.enum(MODEL_IDS),
    fallbackModel: z.enum(MODEL_IDS).nullable(),
    approvedModels: z.array(z.enum(MODEL_IDS)).min(1),
    monthlyBudgetUsd: z.number().min(0).max(10_000),
    dailyBudgetUsd: z.number().min(0).max(1_000),
    maxCostPerRequestUsd: z.number().min(0.001).max(5),
    maxOutputTokens: z.number().int().min(100).max(4000),
    guestDailyRequests: z.number().int().min(0).max(10_000),
    userDailyRequests: z.number().int().min(0).max(10_000),
    userMonthlyRequests: z.number().int().min(0).max(100_000),
    alertThresholds: z.array(z.number().int().min(1).max(100)).max(8),
    languages: z.array(z.enum(ASSISTANT_LANGUAGES)).min(1),
    welcome: z.object({ en: z.string().max(600), ur: z.string().max(600), "roman-ur": z.string().max(600) }),
    quickActions: z.array(z.object({ key: z.enum(QUICK_ACTION_KEYS), enabled: z.boolean() })),
  })
  .refine((s) => s.approvedModels.includes(s.defaultModel), { message: "The default model must be approved.", path: ["defaultModel"] })
  .refine((s) => !s.fallbackModel || s.approvedModels.includes(s.fallbackModel), {
    message: "The fallback model must be approved.",
    path: ["fallbackModel"],
  })

export type AiSettings = z.infer<typeof aiSettingsSchema>

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: true,
  emergencyShutdown: false,
  // gpt-4.1-mini is low-cost, non-reasoning (fast) and calls tools reliably.
  defaultModel: "openai/gpt-4.1-mini",
  fallbackModel: "openai/gpt-4.1-nano",
  approvedModels: ["openai/gpt-4.1-mini", "openai/gpt-4.1-nano"],
  monthlyBudgetUsd: 20,
  dailyBudgetUsd: 2,
  maxCostPerRequestUsd: 0.02,
  maxOutputTokens: 700,
  guestDailyRequests: 20,
  userDailyRequests: 60,
  userMonthlyRequests: 600,
  alertThresholds: [50, 75, 90, 100],
  languages: ["en", "ur", "roman-ur"],
  welcome: { en: "", ur: "", "roman-ur": "" },
  quickActions: QUICK_ACTION_KEYS.map((key) => ({ key, enabled: true })),
}

export type PublicAssistantConfig = {
  available: boolean
  aiEnabled: boolean
  languages: AssistantLanguage[]
  welcome: AiSettings["welcome"]
  quickActions: QuickActionKey[]
}

export function modelPrice(model: string) {
  return MODEL_CATALOG[model as AssistantModelId] ?? MODEL_CATALOG["openai/gpt-4.1-mini"]
}

export function costMicroUsd(model: string, input: number, cached: number, output: number) {
  const p = modelPrice(model)
  const uncached = Math.max(0, input - cached)
  return Math.ceil(uncached * p.input + cached * p.cached + output * p.output)
}

export const TOPICS = ["membership", "events", "governance", "blockchain", "regulatory", "business", "support", "general"] as const
const TOPIC_WORDS: [(typeof TOPICS)[number], RegExp][] = [
  ["membership", /member|fee|join|apply|certificate|renew|ممبر|rukniyat/i],
  ["events", /event|webinar|conference|summit|meetup|ایونٹ/i],
  ["governance", /vote|voting|election|proposal|governance|board|ووٹ/i],
  ["regulatory", /regulat|law|legal|pvara|secp|sbp|tax|compliance|licen|ضوابط|qanoon/i],
  ["blockchain", /blockchain|crypto|bitcoin|token|xrpl|web3|wallet|nft|defi|بلاک/i],
  ["business", /business|startup|invest|opportunit|partner|کاروبار/i],
  ["support", /support|complain|help|concern|issue|problem|contact|شکایت/i],
]

export function classifyTopic(text: string) {
  return TOPIC_WORDS.find(([, re]) => re.test(text))?.[0] ?? "general"
}

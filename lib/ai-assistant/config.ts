export const ASSISTANT_LANGUAGES = ["en", "ur", "roman-ur"] as const
export type AssistantLanguage = (typeof ASSISTANT_LANGUAGES)[number]

// gemini-2.5-flash-lite was cheaper but leaked tool calls as plain "tool_code"
// text; gpt-4.1-mini is low-cost, non-reasoning (fast) and calls tools reliably.
export const ASSISTANT_MODEL = process.env.AI_ASSISTANT_MODEL || "openai/gpt-4.1-mini"

// USD per 1M tokens for ASSISTANT_MODEL. Stored with each usage row.
export const PRICING = {
  version: "gpt-4.1-mini@2026-11",
  inputPerMillion: 0.4,
  cachedInputPerMillion: 0.1,
  outputPerMillion: 1.6,
}

export const BUDGET = {
  monthlyHardLimitUsd: 20,
  maxOutputTokens: 700,
  maxHistoryMessages: 12,
  guestDailyRequests: 20,
  userDailyRequests: 60,
}

export function costMicroUsd(input: number, cached: number, output: number) {
  const uncached = Math.max(0, input - cached)
  const usd =
    (uncached * PRICING.inputPerMillion + cached * PRICING.cachedInputPerMillion + output * PRICING.outputPerMillion) /
    1_000_000
  return Math.ceil(usd * 1_000_000)
}

export const ASSISTANT_LANGUAGES = ["en", "ur", "roman-ur"] as const
export type AssistantLanguage = (typeof ASSISTANT_LANGUAGES)[number]

// Chosen from the live AI Gateway catalog as the lowest-cost model with solid
// English/Urdu quality and reliable tool calling.
export const ASSISTANT_MODEL = process.env.AI_ASSISTANT_MODEL || "google/gemini-2.5-flash-lite"

// USD per 1M tokens for ASSISTANT_MODEL. Stored with each usage row.
export const PRICING = {
  version: "gemini-2.5-flash-lite@2026-11",
  inputPerMillion: 0.1,
  cachedInputPerMillion: 0.025,
  outputPerMillion: 0.4,
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

import "server-only"

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { aiSettings } from "@/lib/db/schema"
import { DEFAULT_AI_SETTINGS, QUICK_ACTION_KEYS, aiSettingsSchema, type AiSettings, type PublicAssistantConfig } from "./config"

function withDefaults(raw: unknown): AiSettings {
  const merged = { ...DEFAULT_AI_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) } as AiSettings
  const known = new Set(merged.quickActions?.map((q) => q.key))
  merged.quickActions = [
    ...(merged.quickActions ?? []).filter((q) => QUICK_ACTION_KEYS.includes(q.key)),
    ...QUICK_ACTION_KEYS.filter((k) => !known.has(k)).map((key) => ({ key, enabled: true })),
  ]
  const parsed = aiSettingsSchema.safeParse(merged)
  return parsed.success ? parsed.data : DEFAULT_AI_SETTINGS
}

export async function getAiSettings(): Promise<AiSettings & { updatedAt: Date | null }> {
  const [row] = await db.select().from(aiSettings).where(eq(aiSettings.id, 1)).limit(1)
  return { ...withDefaults(row?.data), updatedAt: row?.updatedAt ?? null }
}

export async function saveAiSettings(next: AiSettings, userId: string) {
  const data = aiSettingsSchema.parse(next)
  await db
    .insert(aiSettings)
    .values({ id: 1, data, updatedBy: userId, updatedAt: new Date() })
    .onConflictDoUpdate({ target: aiSettings.id, set: { data, updatedBy: userId, updatedAt: new Date() } })
  return data
}

export function toPublicConfig(s: AiSettings, budgetAvailable: boolean): PublicAssistantConfig {
  const aiEnabled = s.enabled && !s.emergencyShutdown && budgetAvailable
  return {
    available: true,
    aiEnabled,
    languages: s.languages,
    welcome: s.welcome,
    quickActions: s.quickActions.filter((q) => q.enabled).map((q) => q.key),
  }
}

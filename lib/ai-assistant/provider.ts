import "server-only"

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, randomUUID } from "node:crypto"
import { createOpenAI } from "@ai-sdk/openai"
import { APICallError, generateText, type LanguageModel } from "ai"
import { eq } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { aiProviderCredentials } from "@/lib/db/schema"
import { PRICING_VERSION, costMicroUsd } from "./config"

const OPENAI = "openai"

/**
 * Encryption key for stored provider secrets. AI_SECRETS_KEY is preferred so it can be rotated
 * independently; otherwise it is derived from BETTER_AUTH_SECRET (rotating that secret means the
 * OpenAI key must be entered again).
 */
function encryptionKey() {
  const material = process.env.AI_SECRETS_KEY || process.env.BETTER_AUTH_SECRET
  if (!material) throw new Error("No server secret is available to encrypt provider credentials.")
  return Buffer.from(hkdfSync("sha256", material, "vaap-ai-provider-credentials", "aes-256-gcm", 32))
}

function encrypt(plain: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") }
}

function decrypt(row: { ciphertext: string; iv: string; authTag: string }) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(row.iv, "base64"))
  decipher.setAuthTag(Buffer.from(row.authTag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(row.ciphertext, "base64")), decipher.final()]).toString("utf8")
}

export type ProviderStatus = {
  connected: boolean
  status: "not-connected" | "untested" | "connected" | "error"
  keyHint: string | null
  lastError: string | null
  lastTestedAt: string | null
  updatedAt: string | null
  envKeyPresent: boolean
}

type CachedKey = { key: string | null; at: number }
let cache: CachedKey | null = null
const CACHE_MS = 30_000

async function credentialRow() {
  const [row] = await db.select().from(aiProviderCredentials).where(eq(aiProviderCredentials.provider, OPENAI)).limit(1)
  return row ?? null
}

/** The OpenAI key in use: the dashboard-saved key first, then the OPENAI_API_KEY environment variable. */
export async function getOpenAiKey(): Promise<string | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.key
  let key: string | null = null
  try {
    const row = await credentialRow()
    if (row) key = decrypt(row)
  } catch (e) {
    console.error("[assistant] stored OpenAI key could not be read:", (e as Error).message)
  }
  key ??= process.env.OPENAI_API_KEY?.trim() || null
  cache = { key, at: Date.now() }
  return key
}

export function clearProviderCache() {
  cache = null
}

export async function getProviderStatus(): Promise<ProviderStatus> {
  const row = await credentialRow()
  const envKeyPresent = Boolean(process.env.OPENAI_API_KEY?.trim())
  if (!row) {
    return {
      connected: envKeyPresent,
      status: envKeyPresent ? "untested" : "not-connected",
      keyHint: envKeyPresent ? "environment variable" : null,
      lastError: null,
      lastTestedAt: null,
      updatedAt: null,
      envKeyPresent,
    }
  }
  return {
    connected: row.status !== "error",
    status: row.status === "connected" ? "connected" : row.status === "error" ? "error" : "untested",
    keyHint: row.keyHint,
    lastError: row.lastError,
    lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    envKeyPresent,
  }
}

export async function storeOpenAiKey(apiKey: string, userId: string) {
  const enc = encrypt(apiKey)
  const keyHint = `${apiKey.slice(0, 3)}…${apiKey.slice(-4)}`
  const values = { ...enc, keyHint, status: "untested", lastError: null, lastTestedAt: null, updatedBy: userId, updatedAt: new Date() }
  await db
    .insert(aiProviderCredentials)
    .values({ provider: OPENAI, ...values })
    .onConflictDoUpdate({ target: aiProviderCredentials.provider, set: values })
  clearProviderCache()
}

export async function deleteOpenAiKey() {
  await db.delete(aiProviderCredentials).where(eq(aiProviderCredentials.provider, OPENAI))
  clearProviderCache()
}

const toOpenAiModel = (gatewayId: string) => gatewayId.replace(/^openai\//, "")

/**
 * Picks how a model is called. OpenAI models go directly to OpenAI when a key is configured;
 * everything else (and OpenAI models without a key) goes through Vercel AI Gateway.
 */
export async function resolveModel(gatewayId: string): Promise<{ model: LanguageModel; provider: "openai-direct" | "gateway" }> {
  if (gatewayId.startsWith("openai/")) {
    const key = await getOpenAiKey()
    if (key) return { model: createOpenAI({ apiKey: key })(toOpenAiModel(gatewayId)), provider: "openai-direct" }
  }
  return { model: gatewayId, provider: "gateway" }
}

export type AiErrorCode =
  | "missing-key"
  | "invalid-key"
  | "insufficient-balance"
  | "rate-limited"
  | "model-unavailable"
  | "timeout"
  | "network"
  | "provider"

const USER_MESSAGES: Record<AiErrorCode, string> = {
  "missing-key": "Ask VAAP AI is being set up and is not available yet. Please check back soon.",
  "invalid-key": "Ask VAAP AI is temporarily unavailable. Our team has been notified.",
  "insufficient-balance": "Ask VAAP AI is temporarily unavailable. Our team has been notified.",
  "rate-limited": "Ask VAAP AI is receiving a lot of questions right now. Please try again in a minute.",
  "model-unavailable": "Ask VAAP AI is temporarily unavailable. Our team has been notified.",
  timeout: "The answer took too long. Please try asking again.",
  network: "We could not reach the AI service. Please try again in a moment.",
  provider: "The assistant could not answer right now. Please try again in a moment.",
}

export function classifyAiError(error: unknown): { code: AiErrorCode; detail: string; userMessage: string } {
  const detail = (error instanceof Error ? error.message : String(error)).slice(0, 400)
  const body = APICallError.isInstance(error) ? `${error.responseBody ?? ""}` : ""
  const status = APICallError.isInstance(error) ? error.statusCode : undefined
  const text = `${detail} ${body}`.toLowerCase()

  let code: AiErrorCode = "provider"
  if (/insufficient_quota|exceeded your current quota|billing|credit/.test(text) || status === 402) code = "insufficient-balance"
  else if (status === 401 || /invalid_api_key|incorrect api key|unauthorized|authentication/.test(text)) code = "invalid-key"
  else if (/api key is missing|oidc|ai_gateway_api_key/.test(text)) code = "missing-key"
  else if (status === 429 || /rate limit/.test(text)) code = "rate-limited"
  else if (status === 404 || /model_not_found|does not exist|not have access to model/.test(text)) code = "model-unavailable"
  else if (/timeout|timed out|aborted/.test(text)) code = "timeout"
  else if (/fetch failed|econnreset|enotfound|network|socket/.test(text)) code = "network"

  return { code, detail: `[${code}] ${detail}`, userMessage: USER_MESSAGES[code] }
}

/** Checks the key, model access and billing with a minimal generation, and records the result. */
export async function testOpenAiConnection(gatewayModel: string) {
  const key = await getOpenAiKey()
  if (!key) return { ok: false as const, code: "missing-key" as const, message: "No OpenAI API key is configured." }

  const modelId = gatewayModel.startsWith("openai/") ? gatewayModel : "openai/gpt-4.1-nano"
  const row = await credentialRow()
  const record = async (status: "connected" | "error", lastError: string | null) => {
    if (!row) return
    await db
      .update(aiProviderCredentials)
      .set({ status, lastError, lastTestedAt: new Date() })
      .where(eq(aiProviderCredentials.provider, OPENAI))
  }

  try {
    const { usage, response } = await generateText({
      model: createOpenAI({ apiKey: key })(toOpenAiModel(modelId)),
      prompt: "Reply with the single word: OK",
      maxOutputTokens: 16,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(20_000),
    })
    const input = usage.inputTokens ?? 0
    const output = usage.outputTokens ?? 0
    const requestId = randomUUID()
    await pool
      .query(
        `insert into ai_usage_logs ("requestId", "sessionId", "messageId", model, "inputTokens", "outputTokens", "costMicroUsd", "pricingVersion", status, topic, question, provider)
         values ($1, 'system:connection-test', $1, $2, $3, $4, $5, $6, 'ok', 'connection-test', '', 'openai-direct')`,
        [requestId, modelId, input, output, costMicroUsd(modelId, input, 0, output), PRICING_VERSION],
      )
      .catch((e) => console.error("[assistant] test usage log failed:", (e as Error).message))
    await record("connected", null)
    return { ok: true as const, model: response.modelId ?? toOpenAiModel(modelId) }
  } catch (error) {
    const { code, detail } = classifyAiError(error)
    await record("error", detail)
    const messages: Partial<Record<AiErrorCode, string>> = {
      "invalid-key": "OpenAI rejected this API key. Check that it was copied completely and has not been revoked.",
      "insufficient-balance": "The key is valid, but the OpenAI account has no available API credit. Add billing at platform.openai.com.",
      "model-unavailable": `This key cannot use ${toOpenAiModel(modelId)}. Choose another model or enable it in your OpenAI project.`,
      "rate-limited": "OpenAI is rate-limiting this key. Wait a minute and test again.",
      timeout: "OpenAI did not respond in time. Test again.",
      network: "The server could not reach OpenAI. Test again.",
    }
    return { ok: false as const, code, message: messages[code] ?? "OpenAI returned an error. See the details below." }
  }
}

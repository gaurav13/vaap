import "server-only"
import crypto from "crypto"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { governanceSettings } from "@/lib/db/schema"
import type { XrplNetwork } from "@/lib/xrpl-network"

// Runtime XRPL configuration. Env vars (XRPL_NETWORK / XRPL_GOVERNANCE_SEED)
// always win so infrastructure can pin values; otherwise the super admin's
// choice from /admin/governance/xrpl-setup is used. The mainnet seed is stored
// AES-256-GCM encrypted with a key derived from BETTER_AUTH_SECRET.

const NETWORK_KEY = "xrpl_network"
const MAINNET_SEED_KEY = "xrpl_mainnet_seed_enc"

function encryptionKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required to store the XRPL key securely")
  return crypto.createHash("sha256").update(`${secret}:vaap-xrpl-seed`).digest()
}

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".")
}

function decrypt(payload: string): string {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"))
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")
}

async function readSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(governanceSettings).where(eq(governanceSettings.key, key)).limit(1)
  return rows[0]?.value || null
}

async function writeSetting(key: string, value: string): Promise<void> {
  await db
    .insert(governanceSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: governanceSettings.key, set: { value, updatedAt: new Date() } })
}

function envNetwork(): XrplNetwork | null {
  const v = process.env.XRPL_NETWORK?.trim().toLowerCase()
  return v === "mainnet" || v === "testnet" ? v : null
}

export function isNetworkPinnedByEnv(): boolean {
  return envNetwork() !== null
}

export async function getActiveNetwork(): Promise<XrplNetwork> {
  const pinned = envNetwork()
  if (pinned) return pinned
  const stored = await readSetting(NETWORK_KEY).catch(() => null)
  return stored === "mainnet" ? "mainnet" : "testnet"
}

/** Seed for the mainnet governance account: env first, then the encrypted DB copy. */
export async function getMainnetSeed(): Promise<string | null> {
  const env = process.env.XRPL_GOVERNANCE_SEED?.trim()
  if (env) return env
  const stored = await readSetting(MAINNET_SEED_KEY).catch(() => null)
  if (!stored) return null
  try {
    return decrypt(stored)
  } catch {
    console.error("[xrpl-config] stored mainnet seed could not be decrypted (BETTER_AUTH_SECRET changed?)")
    return null
  }
}

export async function saveActiveNetwork(network: XrplNetwork): Promise<void> {
  await writeSetting(NETWORK_KEY, network)
}

export async function saveMainnetSeed(seed: string): Promise<void> {
  await writeSetting(MAINNET_SEED_KEY, encrypt(seed))
}

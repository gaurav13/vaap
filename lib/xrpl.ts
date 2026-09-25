import "server-only"
import crypto from "crypto"
import { Client, Wallet } from "xrpl"
import { db } from "@/lib/db"
import { governanceSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// ---------------------------------------------------------------------------
// XRPL testnet governance service.
//
// VAAP anchors governance activity to the XRP Ledger on behalf of members:
// members never need an XRPL account, XRP, or a wallet. A single VAAP
// governance account signs small self-payments whose Memo carries a hash of
// the vote / result. This module is TESTNET-ONLY on purpose — mainnet stays
// disabled until explicitly enabled, so no real value is ever at risk.
// ---------------------------------------------------------------------------

export const XRPL_NETWORK = "testnet" as const
const TESTNET_WSS = "wss://s.altnet.rippletest.net:51233"
const SEED_SETTING_KEY = "xrpl_testnet_seed"

export type XrplSubmitResult = {
  hash: string
  ledgerIndex: number | null
  account: string
  validated: boolean
  rawResult: string
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex")
}

async function readSeedSetting(): Promise<string | null> {
  const rows = await db
    .select()
    .from(governanceSettings)
    .where(eq(governanceSettings.key, SEED_SETTING_KEY))
    .limit(1)
  return rows[0]?.value || null
}

async function writeSeedSetting(seed: string): Promise<void> {
  await db
    .insert(governanceSettings)
    .values({ key: SEED_SETTING_KEY, value: seed })
    .onConflictDoUpdate({
      target: governanceSettings.key,
      set: { value: seed, updatedAt: new Date() },
    })
}

/**
 * Resolve the VAAP governance wallet. Priority:
 *  1. XRPL_GOVERNANCE_SEED env var (operator-provided).
 *  2. A previously auto-provisioned + persisted testnet seed.
 *  3. Generate and fund a fresh testnet wallet via the faucet, then persist it.
 */
export async function getGovernanceWallet(client: Client): Promise<Wallet> {
  const envSeed = process.env.XRPL_GOVERNANCE_SEED?.trim()
  if (envSeed) return Wallet.fromSeed(envSeed)

  const stored = await readSeedSetting()
  if (stored) return Wallet.fromSeed(stored)

  // Auto-provision a funded testnet wallet.
  const funded = await client.fundWallet()
  await writeSeedSetting(funded.wallet.seed as string)
  return funded.wallet
}

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client(TESTNET_WSS, { timeout: 20000 })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.disconnect()
  }
}

/**
 * Submit a 1-drop self-payment whose memo carries the given type + data, and
 * wait for validation. Returns the validated ledger result. Throws on failure
 * so callers can record a `failed` status — we NEVER report a vote/result as
 * XRPL-verified without a real validated transaction.
 */
export async function submitMemo(memoType: string, memoData: string): Promise<XrplSubmitResult> {
  return withClient(async (client) => {
    const wallet = await getGovernanceWallet(client)

    const prepared = await client.autofill({
      TransactionType: "Payment",
      Account: wallet.address,
      Destination: wallet.address,
      Amount: "1", // 1 drop, self-payment
      Memos: [
        {
          Memo: {
            MemoType: Buffer.from(memoType, "utf8").toString("hex").toUpperCase(),
            MemoData: Buffer.from(memoData, "utf8").toString("hex").toUpperCase(),
          },
        },
      ],
    })

    const signed = wallet.sign(prepared)
    const result = await client.submitAndWait(signed.tx_blob)

    const meta = result.result.meta
    const engineResult = typeof meta === "object" && meta ? (meta as { TransactionResult?: string }).TransactionResult : undefined
    const validated = result.result.validated === true && engineResult === "tesSUCCESS"

    if (!validated) {
      throw new Error(`XRPL transaction not validated: ${engineResult ?? "unknown"}`)
    }

    return {
      hash: result.result.hash,
      ledgerIndex: result.result.ledger_index ?? null,
      account: wallet.address,
      validated: true,
      rawResult: JSON.stringify(result.result).slice(0, 8000),
    }
  })
}

/** Look up a previously submitted transaction and confirm it is validated. */
export async function verifyTx(hash: string): Promise<{ validated: boolean; ledgerIndex: number | null }> {
  return withClient(async (client) => {
    try {
      const tx = await client.request({ command: "tx", transaction: hash })
      const validated = tx.result.validated === true
      const ledgerIndex = (tx.result as { ledger_index?: number }).ledger_index ?? null
      return { validated, ledgerIndex }
    } catch {
      return { validated: false, ledgerIndex: null }
    }
  })
}

/** Public testnet explorer URL for a transaction hash. */
export function explorerUrl(hash: string): string {
  return `https://testnet.xrpl.org/transactions/${hash}`
}

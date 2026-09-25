import "server-only"
import crypto from "crypto"
import { Client, Wallet, dropsToXrp } from "xrpl"
import { db } from "@/lib/db"
import { governanceSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { XRPL_NETWORK, explorerUrl, accountExplorerUrl, networkLabel, type XrplNetwork } from "@/lib/xrpl-network"
import { getActiveNetwork, getMainnetSeed } from "@/lib/xrpl-config"

// ---------------------------------------------------------------------------
// XRPL governance anchoring service.
//
// VAAP anchors governance activity to the XRP Ledger on behalf of members:
// members never need an XRPL account, XRP, or a wallet. A single VAAP
// governance account submits an AccountSet transaction whose Memo carries a
// hash of the vote / result.
//
// The network and mainnet key are resolved at runtime (lib/xrpl-config.ts):
// env vars first, then the super admin's saved setup. On mainnet the key is
// never generated or faucet-funded — it must be a funded account the admin
// supplied. Testnet auto-provisions a free faucet wallet.
// ---------------------------------------------------------------------------

export { XRPL_NETWORK, explorerUrl, accountExplorerUrl, networkLabel }
export type { XrplNetwork }

const ENDPOINTS: Record<XrplNetwork, string[]> = {
  mainnet: ["wss://xrplcluster.com", "wss://s1.ripple.com", "wss://s2.ripple.com"],
  testnet: ["wss://s.altnet.rippletest.net:51233", "wss://testnet.xrpl-labs.com"],
}

/** Hard ceiling on the network fee per anchor, in XRP (normal cost is ~0.000012 XRP). */
const MAX_FEE_XRP = "0.002"
/** Refuse to submit on mainnet when spendable balance above reserve drops below this. */
const MIN_SPENDABLE_XRP = 0.05

const TESTNET_SEED_SETTING_KEY = "xrpl_testnet_seed"

export type XrplSubmitResult = {
  hash: string
  ledgerIndex: number | null
  account: string
  network: XrplNetwork
  validated: boolean
  rawResult: string
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex")
}

async function readTestnetSeed(): Promise<string | null> {
  const rows = await db
    .select()
    .from(governanceSettings)
    .where(eq(governanceSettings.key, TESTNET_SEED_SETTING_KEY))
    .limit(1)
  return rows[0]?.value || null
}

async function writeTestnetSeed(seed: string): Promise<void> {
  await db
    .insert(governanceSettings)
    .values({ key: TESTNET_SEED_SETTING_KEY, value: seed })
    .onConflictDoUpdate({
      target: governanceSettings.key,
      set: { value: seed, updatedAt: new Date() },
    })
}

export async function isMainnetConfigured(): Promise<boolean> {
  return Boolean(await getMainnetSeed())
}

/**
 * Resolve the VAAP governance wallet for a network.
 *  - Mainnet: configured seed only. Missing seed is a hard error.
 *  - Testnet: env seed, else a persisted auto-provisioned seed, else a new faucet-funded wallet.
 */
export async function getGovernanceWallet(client: Client | null, network: XrplNetwork): Promise<Wallet> {
  if (network === "mainnet") {
    const seed = await getMainnetSeed()
    if (!seed) throw new Error("Mainnet governance account is not set up; open Admin → XRPL Setup")
    return Wallet.fromSeed(seed)
  }

  const envSeed = process.env.XRPL_GOVERNANCE_SEED?.trim()
  if (envSeed && process.env.XRPL_NETWORK?.trim().toLowerCase() === "testnet") return Wallet.fromSeed(envSeed)

  const stored = await readTestnetSeed()
  if (stored) return Wallet.fromSeed(stored)
  if (!client) throw new Error("Testnet wallet not provisioned yet")

  const funded = await client.fundWallet()
  await writeTestnetSeed(funded.wallet.seed as string)
  return funded.wallet
}

function isAccountNotFound(e: unknown): boolean {
  return (e as { data?: { error?: string } })?.data?.error === "actNotFound"
}

/**
 * Testnet is wiped periodically. Re-fund the SAME saved wallet instead of
 * creating a new one, so the governance address never changes.
 */
async function ensureTestnetAccount(client: Client, wallet: Wallet): Promise<void> {
  try {
    await client.request({ command: "account_info", account: wallet.address, ledger_index: "validated" })
  } catch (e) {
    if (!isAccountNotFound(e)) throw e
    await client.fundWallet(wallet)
  }
}

async function connectWithFailover(network: XrplNetwork): Promise<Client> {
  let lastError: unknown
  for (const url of ENDPOINTS[network]) {
    const client = new Client(url, { timeout: 20000, maxFeeXRP: MAX_FEE_XRP })
    try {
      await client.connect()
      return client
    } catch (e) {
      lastError = e
      await client.disconnect().catch(() => {})
    }
  }
  throw new Error(`Unable to reach any XRPL ${network} server: ${(lastError as Error)?.message ?? "unknown"}`)
}

async function withClient<T>(network: XrplNetwork, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = await connectWithFailover(network)
  try {
    return await fn(client)
  } finally {
    await client.disconnect().catch(() => {})
  }
}

type AccountFunds = { balanceXrp: number; reserveXrp: number; spendableXrp: number }

export async function getAccountFunds(client: Client, address: string): Promise<AccountFunds> {
  const [info, server] = await Promise.all([
    client.request({ command: "account_info", account: address, ledger_index: "validated" }),
    client.request({ command: "server_info" }),
  ])
  const balanceXrp = Number(dropsToXrp(info.result.account_data.Balance))
  const ledger = server.result.info.validated_ledger
  const base = ledger?.reserve_base_xrp ?? 1
  const inc = ledger?.reserve_inc_xrp ?? 0.2
  const reserveXrp = base + inc * (info.result.account_data.OwnerCount ?? 0)
  return { balanceXrp, reserveXrp, spendableXrp: balanceXrp - reserveXrp }
}

function toHex(value: string): string {
  return Buffer.from(value, "utf8").toString("hex").toUpperCase()
}

/**
 * Anchor a memo on-ledger and wait for validation. Throws on any failure so
 * callers record a retryable status — a vote/result is NEVER reported as
 * verified without a validated tesSUCCESS transaction.
 */
export async function submitMemo(memoType: string, memoData: string): Promise<XrplSubmitResult> {
  const network = await getActiveNetwork()
  return withClient(network, async (client) => {
    const wallet = await getGovernanceWallet(client, network)

    if (network === "mainnet") {
      const funds = await getAccountFunds(client, wallet.address)
      if (funds.spendableXrp < MIN_SPENDABLE_XRP) {
        throw new Error(
          `Governance account balance too low (${funds.balanceXrp} XRP, reserve ${funds.reserveXrp} XRP). Top up ${wallet.address}.`,
        )
      }
    } else {
      await ensureTestnetAccount(client, wallet)
    }

    // AccountSet with no flags is a no-op on the account and carries the memo on-ledger.
    const prepared = await client.autofill({
      TransactionType: "AccountSet",
      Account: wallet.address,
      Memos: [
        {
          Memo: {
            MemoType: toHex(memoType),
            MemoFormat: toHex("text/plain"),
            MemoData: toHex(memoData),
          },
        },
      ],
    })

    const signed = wallet.sign(prepared)
    const result = await client.submitAndWait(signed.tx_blob)

    const meta = result.result.meta
    const engineResult =
      typeof meta === "object" && meta ? (meta as { TransactionResult?: string }).TransactionResult : undefined
    if (result.result.validated !== true || engineResult !== "tesSUCCESS") {
      throw new Error(`XRPL transaction not validated: ${engineResult ?? "unknown"}`)
    }

    return {
      hash: result.result.hash,
      ledgerIndex: result.result.ledger_index ?? null,
      account: wallet.address,
      network,
      validated: true,
      rawResult: JSON.stringify(result.result).slice(0, 8000),
    }
  })
}

/** Look up a previously submitted transaction and confirm it is validated with tesSUCCESS. */
export async function verifyTx(
  hash: string,
  network?: XrplNetwork,
): Promise<{ validated: boolean; ledgerIndex: number | null }> {
  return withClient(network ?? (await getActiveNetwork()), async (client) => {
    try {
      const tx = await client.request({ command: "tx", transaction: hash })
      const meta = tx.result.meta
      const engineResult =
        typeof meta === "object" && meta ? (meta as { TransactionResult?: string }).TransactionResult : undefined
      const ledgerIndex = (tx.result as { ledger_index?: number }).ledger_index ?? null
      return { validated: tx.result.validated === true && engineResult === "tesSUCCESS", ledgerIndex }
    } catch {
      return { validated: false, ledgerIndex: null }
    }
  })
}

export type XrplStatus = {
  network: XrplNetwork
  configured: boolean
  address: string | null
  balanceXrp: number | null
  reserveXrp: number | null
  ready: boolean
  message: string
}

/** Health snapshot for the admin dashboard. Never throws and never exposes the seed. */
export async function getXrplStatus(): Promise<XrplStatus> {
  const network = await getActiveNetwork()
  const base: XrplStatus = {
    network,
    configured: network === "testnet" || (await isMainnetConfigured()),
    address: null,
    balanceXrp: null,
    reserveXrp: null,
    ready: false,
    message: "",
  }

  if (!base.configured) {
    return { ...base, message: "Mainnet account not set up yet. Open XRPL Setup to activate it." }
  }

  try {
    const wallet = await getGovernanceWallet(null, network).catch(() => null)
    if (!wallet) return { ...base, ready: true, message: "A testnet wallet will be provisioned on first anchor." }

    return await withClient(network, async (client) => {
      try {
        if (network === "testnet") await ensureTestnetAccount(client, wallet).catch(() => {})
        const funds = await getAccountFunds(client, wallet.address)
        const ready = network === "testnet" || funds.spendableXrp >= MIN_SPENDABLE_XRP
        return {
          ...base,
          address: wallet.address,
          balanceXrp: funds.balanceXrp,
          reserveXrp: funds.reserveXrp,
          ready,
          message: ready ? "Connected and ready to anchor." : "Balance is below the safe minimum. Top up the account.",
        }
      } catch {
        return { ...base, address: wallet.address, message: "Account not found on ledger. Fund it with XRP to activate it." }
      }
    })
  } catch (e) {
    return { ...base, message: (e as Error).message.slice(0, 200) }
  }
}

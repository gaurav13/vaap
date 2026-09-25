"use server"

import { revalidatePath } from "next/cache"
import { Client, Wallet, dropsToXrp } from "xrpl"
import { getSession, isAdmin } from "@/lib/session"
import { isNetworkPinnedByEnv, saveActiveNetwork, saveMainnetSeed } from "@/lib/xrpl-config"
import { drainXrplQueue } from "@/lib/xrpl-worker"

type Result = { ok: true; message: string } | { ok: false; error: string }

const MAINNET_SERVERS = ["wss://xrplcluster.com", "wss://s1.ripple.com", "wss://s2.ripple.com"]

async function requireSuperAdmin() {
  const session = await getSession()
  if (!session?.user || !isAdmin(session.user.role)) throw new Error("Only a super admin can change XRPL settings")
}

function refresh() {
  revalidatePath("/admin/governance")
  revalidatePath("/admin/governance/xrpl-setup")
  revalidatePath("/voting", "layout")
}

async function mainnetBalance(address: string): Promise<number | null> {
  for (const url of MAINNET_SERVERS) {
    const client = new Client(url, { timeout: 15000 })
    try {
      await client.connect()
      const info = await client.request({ command: "account_info", account: address, ledger_index: "validated" })
      return Number(dropsToXrp(info.result.account_data.Balance))
    } catch (e) {
      if ((e as { data?: { error?: string } })?.data?.error === "actNotFound") return null
    } finally {
      await client.disconnect().catch(() => {})
    }
  }
  throw new Error("Couldn't reach the XRP Ledger. Try again in a minute.")
}

/** Use the free, self-provisioning testnet wallet. */
export async function activateTestnet(): Promise<Result> {
  try {
    await requireSuperAdmin()
    if (isNetworkPinnedByEnv()) return { ok: false, error: "The network is fixed by the XRPL_NETWORK variable in Vars." }
    await saveActiveNetwork("testnet")
    await drainXrplQueue().catch(() => {})
    refresh()
    return { ok: true, message: "Testnet is active. Results will be recorded with free test XRP." }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Go live: validate the seed, confirm the account is funded, store it encrypted, and switch to mainnet. */
export async function activateMainnet(seed: string): Promise<Result> {
  try {
    await requireSuperAdmin()
    if (isNetworkPinnedByEnv()) return { ok: false, error: "The network is fixed by the XRPL_NETWORK variable in Vars." }

    let wallet: Wallet
    try {
      wallet = Wallet.fromSeed(seed.trim())
    } catch {
      return { ok: false, error: "That doesn't look like a valid XRPL secret seed (it should start with “s”)." }
    }

    const balance = await mainnetBalance(wallet.classicAddress)
    if (balance === null) {
      return {
        ok: false,
        error: `Account ${wallet.classicAddress} isn't active on mainnet yet. Send it at least 2 XRP, wait a minute, then try again.`,
      }
    }
    if (balance < 1.1) {
      return { ok: false, error: `Balance is only ${balance} XRP. Add a few more XRP (1 XRP is locked as the reserve).` }
    }

    await saveMainnetSeed(seed.trim())
    await saveActiveNetwork("mainnet")
    await drainXrplQueue().catch(() => {})
    refresh()
    return { ok: true, message: `Mainnet is live. Account ${wallet.classicAddress} holds ${balance} XRP.` }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Anchor anything waiting in the queue right now. */
export async function runXrplQueueNow(): Promise<Result> {
  try {
    await requireSuperAdmin()
    const { processed, remaining } = await drainXrplQueue(10)
    refresh()
    const done = processed.filter((p) => p.status === "verified").length
    const failed = processed.length - done
    return {
      ok: true,
      message: processed.length
        ? `Recorded ${done} item(s)${failed ? `, ${failed} will retry` : ""}${remaining ? ". More are waiting." : "."}`
        : "Nothing waiting. Everything is already on the ledger.",
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

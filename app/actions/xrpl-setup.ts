"use server"

import { revalidatePath } from "next/cache"
import { Client, Wallet, dropsToXrp } from "xrpl"
import { getSession, isAdmin } from "@/lib/session"
import {
  getMainnetSeed,
  getStoredMainnetSeed,
  isNetworkPinnedByEnv,
  saveActiveNetwork,
  saveMainnetSeed,
} from "@/lib/xrpl-config"
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

/** Go live with the account that is already saved, without re-entering the seed. */
export async function activateSavedMainnet(): Promise<Result> {
  try {
    await requireSuperAdmin()
    if (isNetworkPinnedByEnv()) return { ok: false, error: "The network is fixed by the XRPL_NETWORK variable in Vars." }
    const seed = await getMainnetSeed()
    if (!seed) return { ok: false, error: "No mainnet account is saved yet." }
    const wallet = Wallet.fromSeed(seed)
    const balance = await mainnetBalance(wallet.classicAddress)
    if (balance === null || balance < 1.1) {
      return {
        ok: false,
        error: `Account ${wallet.classicAddress} needs at least 2 XRP before going live (current: ${balance ?? 0} XRP).`,
      }
    }
    await saveActiveNetwork("mainnet")
    await drainXrplQueue().catch(() => {})
    refresh()
    return { ok: true, message: `Mainnet is live with your account ${wallet.classicAddress} (${balance} XRP).` }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Save the permanent mainnet account and go live. A different account can only
 * replace a saved one when `replace` is explicitly true.
 */
export async function activateMainnet(seed: string, replace = false): Promise<Result> {
  try {
    await requireSuperAdmin()
    if (isNetworkPinnedByEnv()) return { ok: false, error: "The network is fixed by the XRPL_NETWORK variable in Vars." }

    let wallet: Wallet
    try {
      wallet = Wallet.fromSeed(seed.trim())
    } catch {
      return { ok: false, error: "That doesn't look like a valid XRPL secret seed (it should start with “s”)." }
    }

    const existing = await getStoredMainnetSeed()
    if (existing && Wallet.fromSeed(existing).classicAddress !== wallet.classicAddress && !replace) {
      return {
        ok: false,
        error: `A mainnet account (${Wallet.fromSeed(existing).classicAddress}) is already saved. Use "Replace account" only if you really want to change it.`,
      }
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

import "server-only"
import { Client, dropsToXrp } from "xrpl"
import type { XrplNetwork } from "@/lib/xrpl-network"

const SERVERS: Record<XrplNetwork, string[]> = {
  mainnet: ["wss://xrplcluster.com", "wss://s1.ripple.com", "wss://s2.ripple.com"],
  testnet: ["wss://s.altnet.rippletest.net:51233"],
}

export type AccountTx = {
  hash: string
  type: string
  direction: "in" | "out" | "self"
  amountXrp: number | null
  feeXrp: number | null
  result: string
  date: string | null
  counterparty: string | null
}

export type AccountDetails = {
  network: XrplNetwork
  address: string
  connected: boolean
  activated: boolean
  balanceXrp: number | null
  reserveXrp: number
  transactions: AccountTx[]
  error: string | null
}

function toXrp(amount: unknown): number | null {
  if (typeof amount === "string" || typeof amount === "number") return Number(dropsToXrp(String(amount)))
  return null
}

export async function getAccountDetails(network: XrplNetwork, address: string): Promise<AccountDetails> {
  const base: AccountDetails = {
    network,
    address,
    connected: false,
    activated: false,
    balanceXrp: null,
    reserveXrp: 1,
    transactions: [],
    error: null,
  }

  for (const url of SERVERS[network]) {
    const client = new Client(url, { timeout: 15000 })
    try {
      await client.connect()
      base.connected = true

      try {
        const info = await client.request({ command: "account_info", account: address, ledger_index: "validated" })
        base.activated = true
        base.balanceXrp = Number(dropsToXrp(info.result.account_data.Balance))
      } catch (e) {
        if ((e as { data?: { error?: string } })?.data?.error === "actNotFound") return base
        throw e
      }

      const txs = await client.request({ command: "account_tx", account: address, limit: 15 })
      base.transactions = txs.result.transactions.map((entry) => {
        const raw = entry as unknown as Record<string, unknown>
        const tx = (raw.tx_json ?? raw.tx ?? {}) as Record<string, unknown>
        const meta = (raw.meta ?? {}) as Record<string, unknown>
        const from = tx.Account as string | undefined
        const to = tx.Destination as string | undefined
        const delivered = meta.delivered_amount ?? tx.DeliverMax ?? tx.Amount
        const direction: AccountTx["direction"] =
          from === address && to === address ? "self" : from === address ? "out" : "in"
        return {
          hash: (raw.hash as string) ?? (tx.hash as string) ?? "",
          type: (tx.TransactionType as string) ?? "Unknown",
          direction,
          amountXrp: tx.TransactionType === "Payment" ? toXrp(delivered) : null,
          feeXrp: direction === "in" ? null : toXrp(tx.Fee),
          result: (meta.TransactionResult as string) ?? "",
          date: (raw.close_time_iso as string) ?? null,
          counterparty: direction === "in" ? (from ?? null) : (to ?? null),
        }
      })
      return base
    } catch (e) {
      base.error = (e as Error).message
    } finally {
      await client.disconnect().catch(() => {})
    }
  }

  if (!base.connected) base.error = "Couldn't reach the XRP Ledger right now."
  return base
}

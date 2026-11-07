"use server"

import { db } from "@/lib/db"
import { notifications, settings } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { CRYPTO_PAYMENT_COIN_IDS, type CryptoPayment, type CryptoPaymentCoinId } from "@/lib/site-settings"
import { revalidatePath } from "next/cache"

const ADDRESS_RULES: Record<CryptoPaymentCoinId, { pattern: RegExp; hint: string }> = {
  USDT_TRC20: { pattern: /^T[1-9A-HJ-NP-Za-km-z]{33}$/, hint: "a Tron address starting with T (34 characters)" },
  XRP: { pattern: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/, hint: "an XRP Ledger address starting with r" },
  BTC: {
    pattern: /^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    hint: "a Bitcoin address starting with bc1, 1 or 3",
  },
  ETH: { pattern: /^0x[a-fA-F0-9]{40}$/, hint: "an Ethereum address starting with 0x (42 characters)" },
}

const COIN_NAMES: Record<CryptoPaymentCoinId, string> = {
  USDT_TRC20: "USDT (TRC-20)",
  XRP: "XRP",
  BTC: "BTC",
  ETH: "ETH",
}

export type SaveCryptoPaymentResult =
  | { ok: true }
  | { ok: false; error: string; field?: CryptoPaymentCoinId | "xrpTag" | "instructions" }

export async function saveCryptoPayment(input: CryptoPayment): Promise<SaveCryptoPaymentResult> {
  const session = await getSession()
  if (!session?.user) return { ok: false, error: "Please sign in again." }
  if (session.user.role !== "admin") return { ok: false, error: "Only super admins can change payment wallets." }

  const coins = {} as CryptoPayment["coins"]
  for (const id of CRYPTO_PAYMENT_COIN_IDS) {
    const raw = input?.coins?.[id]
    const address = String(raw?.address ?? "").trim()
    if (address && !ADDRESS_RULES[id].pattern.test(address)) {
      return { ok: false, field: id, error: `${COIN_NAMES[id]} wallet must be ${ADDRESS_RULES[id].hint}.` }
    }
    coins[id] = { enabled: raw?.enabled !== false, address }
  }

  const xrpTag = String(input?.xrpTag ?? "").trim()
  if (xrpTag && (!/^\d{1,10}$/.test(xrpTag) || Number(xrpTag) > 4294967295)) {
    return { ok: false, field: "xrpTag", error: "XRP destination tag must be a whole number up to 4294967295." }
  }

  const instructions = String(input?.instructions ?? "").trim()
  if (instructions.length > 600) {
    return { ok: false, field: "instructions", error: "Payment instructions must be 600 characters or fewer." }
  }

  const json = JSON.stringify({ coins, xrpTag, instructions } satisfies CryptoPayment)
  await db
    .insert(settings)
    .values({ key: "cryptoPayment", value: json })
    .onConflictDoUpdate({ target: settings.key, set: { value: json, updatedAt: new Date() } })

  await db.insert(notifications).values({
    role: "admin",
    type: "info",
    title: "Crypto payment wallets updated",
    body: `${session.user.name ?? "An admin"} updated the crypto payment settings.`,
    link: "/admin/payments",
  })

  revalidatePath("/admin/payments")
  return { ok: true }
}

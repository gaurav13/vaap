import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getCryptoPayment } from "@/lib/site-settings"
import { CryptoPaymentAdmin } from "@/components/admin/crypto-payment-admin"

export const dynamic = "force-dynamic"

export default async function AdminPaymentsPage() {
  const session = await getSession()
  if (session?.user?.role !== "admin") redirect("/admin")

  const settings = await getCryptoPayment()
  const envDefaults = {
    USDT_TRC20: (process.env.CRYPTO_WALLET_USDT_TRC20 || "").trim(),
    XRP: (process.env.CRYPTO_WALLET_XRP || "").trim(),
    BTC: (process.env.CRYPTO_WALLET_BTC || "").trim(),
    ETH: (process.env.CRYPTO_WALLET_ETH || "").trim(),
    xrpTag: (process.env.CRYPTO_XRP_TAG || "").trim(),
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Crypto Payments</h1>
      <p className="mt-1 text-pretty text-muted-2">
        Set the wallets applicants pay into during membership checkout. Changes go live immediately.
      </p>
      <CryptoPaymentAdmin initial={settings} envDefaults={envDefaults} />
    </div>
  )
}

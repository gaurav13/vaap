"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { saveCryptoPayment } from "@/app/actions/admin-crypto-payment"
import type { CryptoPayment, CryptoPaymentCoinId } from "@/lib/site-settings"

const CRYPTO_PAYMENT_COIN_IDS: CryptoPaymentCoinId[] = ["USDT_TRC20", "XRP", "BTC", "ETH"]

const COIN_META: Record<CryptoPaymentCoinId, { name: string; network: string; placeholder: string }> = {
  USDT_TRC20: { name: "USDT", network: "TRC-20 · Tron", placeholder: "T…" },
  XRP: { name: "XRP", network: "XRP Ledger", placeholder: "r…" },
  BTC: { name: "BTC", network: "Bitcoin", placeholder: "bc1… / 1… / 3…" },
  ETH: { name: "ETH", network: "Ethereum · ERC-20", placeholder: "0x…" },
}

type EnvDefaults = Record<CryptoPaymentCoinId | "xrpTag", string>
type Status = { kind: "saved" } | { kind: "error"; message: string; field?: string } | null

export function CryptoPaymentAdmin({ initial, envDefaults }: { initial: CryptoPayment; envDefaults: EnvDefaults }) {
  const [form, setForm] = useState<CryptoPayment>(initial)
  const [status, setStatus] = useState<Status>(null)
  const [pending, startTransition] = useTransition()

  function updateCoin(id: CryptoPaymentCoinId, patch: Partial<CryptoPayment["coins"][CryptoPaymentCoinId]>) {
    setStatus(null)
    setForm((f) => ({ ...f, coins: { ...f.coins, [id]: { ...f.coins[id], ...patch } } }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveCryptoPayment(form)
      setStatus(res.ok ? { kind: "saved" } : { kind: "error", message: res.error, field: res.field })
    })
  }

  const errorField = status?.kind === "error" ? status.field : undefined

  return (
    <form onSubmit={onSubmit} className="mt-6 flex max-w-3xl flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <header className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-heading">Receiving wallets</h2>
          <p className="mt-0.5 text-sm text-muted-2">
            Leave a field blank to use the server default. Unchecked coins are hidden from checkout.
          </p>
        </header>
        <ul className="divide-y divide-line">
          {CRYPTO_PAYMENT_COIN_IDS.map((id) => {
            const meta = COIN_META[id]
            const coin = form.coins[id]
            const effective = coin.address.trim() || envDefaults[id]
            const inputId = `wallet-${id}`
            return (
              <li key={id} className="flex flex-col gap-3 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-heading">{meta.name}</p>
                    <p className="text-xs text-muted-2">{meta.network}</p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-heading">
                    <Checkbox checked={coin.enabled} onCheckedChange={(v) => updateCoin(id, { enabled: v })} />
                    Accept
                  </label>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={inputId} className="sr-only">
                    {meta.name} wallet address
                  </Label>
                  <Input
                    id={inputId}
                    value={coin.address}
                    onChange={(e) => updateCoin(id, { address: e.target.value })}
                    placeholder={envDefaults[id] || meta.placeholder}
                    spellCheck={false}
                    autoComplete="off"
                    disabled={!coin.enabled}
                    aria-invalid={errorField === id}
                    className="font-mono text-sm"
                  />
                  {coin.enabled && !effective ? (
                    <p className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertTriangle className="size-3.5" aria-hidden="true" />
                      No wallet set. Applicants will not see an address for this coin.
                    </p>
                  ) : coin.enabled && !coin.address.trim() ? (
                    <p className="text-xs text-muted-2">Using server default.</p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-5 rounded-2xl border border-line bg-card px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="xrp-tag">XRP destination tag</Label>
          <Input
            id="xrp-tag"
            inputMode="numeric"
            value={form.xrpTag}
            onChange={(e) => {
              setStatus(null)
              setForm((f) => ({ ...f, xrpTag: e.target.value }))
            }}
            placeholder={envDefaults.xrpTag || "Optional"}
            aria-invalid={errorField === "xrpTag"}
            className="max-w-xs font-mono text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pay-instructions">Instructions for payers</Label>
          <Textarea
            id="pay-instructions"
            rows={3}
            maxLength={600}
            value={form.instructions}
            onChange={(e) => {
              setStatus(null)
              setForm((f) => ({ ...f, instructions: e.target.value }))
            }}
            placeholder="e.g. Send only on the listed network. Payments are verified within 24 hours."
            aria-invalid={errorField === "instructions"}
          />
          <p className="text-xs text-muted-2">Shown above the coin choices at checkout. Optional.</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save payment settings"}
        </Button>
        <p role="status" aria-live="polite" className="text-sm">
          {status?.kind === "saved" ? (
            <span className="flex items-center gap-1.5 text-green">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Saved
            </span>
          ) : status?.kind === "error" ? (
            <span className="text-destructive">{status.message}</span>
          ) : null}
        </p>
      </div>
    </form>
  )
}

"use client"

import { useMemo, useState, useTransition } from "react"
import { Check, CircleDollarSign, Clock, Wallet, X } from "lucide-react"
import { approveReward, payReward, rejectReward } from "@/app/actions/admin-referrals"
import { cn } from "@/lib/utils"

type Reward = {
  id: number
  referrerName: string
  referrerRole: string
  memberName: string
  memberEmail: string
  membershipCategory: string
  commissionRate: string
  rewardAmount: number
  currency: string
  status: string
  note: string
  createdAt: string | Date
}
type Payment = {
  id: number
  recipientName: string
  role: string
  gross: number
  adjustments: number
  finalAmount: number
  currency: string
  method: string
  reference: string
  status: string
  createdAt: string | Date
}

const money = (n: number, ccy = "PKR") => `${ccy} ${Number(n || 0).toLocaleString("en-PK")}`
const date = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })

const STATUS_STYLES: Record<string, string> = {
  eligible: "bg-amber-100 text-amber-800",
  under_review: "bg-amber-100 text-amber-800",
  pending_eligibility: "bg-muted text-muted-foreground",
  approved: "bg-sky-100 text-sky-800",
  payment_processing: "bg-indigo-100 text-indigo-800",
  paid: "bg-green/15 text-green",
  cancelled: "bg-destructive/10 text-destructive",
  reversed: "bg-destructive/10 text-destructive",
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}

export function RewardsManager({ rewards: initialRewards, payments }: { rewards: Reward[]; payments: Payment[] }) {
  const [rewards, setRewards] = useState(initialRewards)
  const [tab, setTab] = useState<"queue" | "payments">("queue")
  const [payFor, setPayFor] = useState<Reward | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const totals = useMemo(() => {
    const pendingVal = rewards.filter((r) => ["eligible", "under_review", "pending_eligibility"].includes(r.status)).reduce((a, r) => a + r.rewardAmount, 0)
    const approvedVal = rewards.filter((r) => r.status === "approved").reduce((a, r) => a + r.rewardAmount, 0)
    const paidVal = payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.finalAmount, 0)
    return { pendingVal, approvedVal, paidVal }
  }, [rewards, payments])

  function doApprove(id: number) {
    setError(null)
    startTransition(async () => {
      const res = await approveReward(id)
      if (res.ok) setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)))
      else setError(res.error ?? "Could not approve reward.")
    })
  }

  function doReject(id: number) {
    const reason = window.prompt("Reason for rejecting this reward?") ?? ""
    setError(null)
    startTransition(async () => {
      const res = await rejectReward(id, reason)
      if (res.ok) setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)))
      else setError(res.error ?? "Could not reject reward.")
    })
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Rewards &amp; Payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review eligible referral rewards, approve them, and record payouts to referrers.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={Clock} label="Pending review" value={money(totals.pendingVal)} tone="amber" />
        <Stat icon={CircleDollarSign} label="Approved (awaiting payout)" value={money(totals.approvedVal)} tone="sky" />
        <Stat icon={Wallet} label="Paid out" value={money(totals.paidVal)} tone="green" />
      </section>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 flex gap-1 border-b border-border">
        {(["queue", "payments"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-semibold capitalize transition-colors",
              tab === t ? "text-green" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "queue" ? "Reward queue" : "Payout history"}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-green" />}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          {tab === "queue" ? (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Referrer</th>
                  <th className="px-5 py-3 font-semibold">Member</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Reward</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rewards.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No rewards in the queue yet.
                    </td>
                  </tr>
                )}
                {rewards.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground">{r.referrerName || "—"}</p>
                      <p className="text-xs capitalize text-muted-foreground">{r.referrerRole.replace(/_/g, " ")}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-foreground">{r.memberName || r.memberEmail}</p>
                      <p className="text-xs text-muted-foreground">{r.memberEmail}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{r.membershipCategory}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground">{money(r.rewardAmount, r.currency)}</p>
                      <p className="text-xs text-muted-foreground">{r.commissionRate}</p>
                    </td>
                    <td className="px-5 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {["eligible", "under_review", "pending_eligibility"].includes(r.status) && (
                          <>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => doApprove(r.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-green px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green/90 disabled:opacity-50"
                            >
                              <Check className="size-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => doReject(r.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                            >
                              <X className="size-3.5" /> Reject
                            </button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setPayFor(r)}
                            className="inline-flex items-center gap-1 rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
                          >
                            <Wallet className="size-3.5" /> Pay
                          </button>
                        )}
                        {["paid", "cancelled", "reversed"].includes(r.status) && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Recipient</th>
                  <th className="px-5 py-3 font-semibold">Gross</th>
                  <th className="px-5 py-3 font-semibold">Adjust.</th>
                  <th className="px-5 py-3 font-semibold">Final</th>
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No payouts recorded yet.
                    </td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground">{p.recipientName || "—"}</p>
                      <p className="text-xs capitalize text-muted-foreground">{p.role.replace(/_/g, " ")}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{money(p.gross, p.currency)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{money(p.adjustments, p.currency)}</td>
                    <td className="px-5 py-3 font-semibold text-foreground">{money(p.finalAmount, p.currency)}</td>
                    <td className="px-5 py-3 capitalize text-foreground">{p.method || "—"}</td>
                    <td className="px-5 py-3"><StatusPill status={p.status} /></td>
                    <td className="px-5 py-3 text-muted-foreground">{date(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {payFor && (
        <PayDialog
          reward={payFor}
          onClose={() => setPayFor(null)}
          onPaid={(id) => {
            setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, status: "paid" } : r)))
            setPayFor(null)
          }}
        />
      )}
    </div>
  )
}

function PayDialog({ reward, onClose, onPaid }: { reward: Reward; onClose: () => void; onPaid: (id: number) => void }) {
  const [method, setMethod] = useState("bank_transfer")
  const [reference, setReference] = useState("")
  const [adjustments, setAdjustments] = useState("0")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const final = Math.max(0, reward.rewardAmount + (parseInt(adjustments || "0", 10) || 0))

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await payReward({
        rewardId: reward.id,
        method,
        reference,
        adjustments: parseInt(adjustments || "0", 10) || 0,
      })
      if (res.ok) onPaid(reward.id)
      else setError(res.error ?? "Could not record payout.")
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-foreground">Record payout</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paying <span className="font-semibold text-foreground">{reward.referrerName}</span> for referring{" "}
          {reward.memberName || reward.memberEmail}.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-foreground">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="bank_transfer">Bank transfer</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="cash">Cash</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Reference / transaction ID</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TXN-48213"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Adjustment (+/- {reward.currency})</label>
            <input
              type="number"
              value={adjustments}
              onChange={(e) => setAdjustments(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">Negative values reduce the payout (e.g. tax withholding).</p>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">Final payout</span>
            <span className="text-lg font-bold text-foreground">{money(final, reward.currency)}</span>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !reference.trim()}
            onClick={submit}
            className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green/90 disabled:opacity-50"
          >
            {pending ? "Recording…" : "Confirm payout"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet
  label: string
  value: string
  tone: "amber" | "sky" | "green"
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50",
    sky: "border-sky-200 bg-sky-50",
    green: "border-green/20 bg-green/5",
  }
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border p-4", tones[tone])}>
      <span className="flex size-10 items-center justify-center rounded-lg bg-card">
        <Icon className="size-5 text-foreground" />
      </span>
      <div>
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

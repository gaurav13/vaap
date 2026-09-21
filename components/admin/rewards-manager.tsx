"use client"

import { useMemo, useState, useTransition } from "react"
import { Check, CircleDollarSign, Clock, Coins, PiggyBank, Rocket, Target, Wallet, X } from "lucide-react"
import {
  approveReward,
  payReward,
  rejectReward,
  releaseCollectedRewards,
  savePayoutThreshold,
} from "@/app/actions/admin-referrals"
import { cn } from "@/lib/utils"

type Reward = {
  id: number
  referrerUserId?: string | null
  partnerId?: number | null
  referrerName: string
  referrerRole: string
  memberName?: string
  memberEmail: string
  membershipCategory: string
  commissionRate: string
  eligibleAmount?: number
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
type Payout = { threshold: number; currency: string }

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
      {status === "pending_eligibility" ? "collecting" : status.replace(/_/g, " ")}
    </span>
  )
}

type Group = {
  key: string
  referrerUserId: string | null
  partnerId: number | null
  referrerName: string
  referrerRole: string
  total: number
  count: number
  currency: string
  ids: number[]
  lastAt: string | Date
}

export function RewardsManager({
  rewards: initialRewards,
  payments,
  payout,
}: {
  rewards: Reward[]
  payments: Payment[]
  payout: Payout
}) {
  const [rewards, setRewards] = useState(initialRewards)
  const [threshold, setThreshold] = useState<number>(payout.threshold)
  const [thresholdDraft, setThresholdDraft] = useState<string>(String(payout.threshold))
  const [tab, setTab] = useState<"collecting" | "queue" | "payments">("collecting")
  const [payFor, setPayFor] = useState<Reward | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const ccy = payout.currency || "PKR"

  const totals = useMemo(() => {
    const collectingVal = rewards
      .filter((r) => r.status === "pending_eligibility")
      .reduce((a, r) => a + r.rewardAmount, 0)
    const pendingVal = rewards
      .filter((r) => ["eligible", "under_review"].includes(r.status))
      .reduce((a, r) => a + r.rewardAmount, 0)
    const approvedVal = rewards.filter((r) => r.status === "approved").reduce((a, r) => a + r.rewardAmount, 0)
    const paidVal = payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.finalAmount, 0)
    return { collectingVal, pendingVal, approvedVal, paidVal }
  }, [rewards, payments])

  // Group collecting rewards by referrer to show accumulation toward threshold.
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const r of rewards) {
      if (r.status !== "pending_eligibility") continue
      const key = r.referrerUserId
        ? `u:${r.referrerUserId}`
        : r.partnerId
          ? `p:${r.partnerId}`
          : `n:${r.referrerName || "unknown"}`
      const existing = map.get(key)
      if (existing) {
        existing.total += r.rewardAmount
        existing.count += 1
        existing.ids.push(r.id)
        if (new Date(r.createdAt) > new Date(existing.lastAt)) existing.lastAt = r.createdAt
      } else {
        map.set(key, {
          key,
          referrerUserId: r.referrerUserId ?? null,
          partnerId: r.partnerId ?? null,
          referrerName: r.referrerName || r.memberEmail || "Unknown referrer",
          referrerRole: r.referrerRole,
          total: r.rewardAmount,
          count: 1,
          currency: r.currency || ccy,
          ids: [r.id],
          lastAt: r.createdAt,
        })
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [rewards, ccy])

  const queueRewards = useMemo(
    () => rewards.filter((r) => r.status !== "pending_eligibility"),
    [rewards],
  )

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

  function doRelease(group: Group) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await releaseCollectedRewards({
        referrerUserId: group.referrerUserId,
        partnerId: group.partnerId,
      })
      if (res.ok) {
        setRewards((prev) =>
          prev.map((r) => (group.ids.includes(r.id) ? { ...r, status: "eligible" } : r)),
        )
        setNotice(`Released ${group.count} reward${group.count === 1 ? "" : "s"} for ${group.referrerName} to the payout queue.`)
      } else {
        setError("Could not release rewards.")
      }
    })
  }

  function saveThreshold() {
    const value = Math.max(0, Math.round(Number(thresholdDraft) || 0))
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await savePayoutThreshold(value)
      if (res.ok) {
        setThreshold(value)
        setThresholdDraft(String(value))
        setNotice(`Payout threshold set to ${money(value, ccy)}.`)
      } else {
        setError("Could not update the payout threshold.")
      }
    })
  }

  const thresholdDirty = String(threshold) !== thresholdDraft.trim()

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Rewards &amp; Payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Referral rewards accumulate per referrer until they reach the payout threshold, then move to the queue for
          review and payout.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Coins} label="Collecting" value={money(totals.collectingVal, ccy)} tone="slate" />
        <Stat icon={Clock} label="Pending review" value={money(totals.pendingVal, ccy)} tone="amber" />
        <Stat icon={CircleDollarSign} label="Approved (awaiting payout)" value={money(totals.approvedVal, ccy)} tone="sky" />
        <Stat icon={Wallet} label="Paid out" value={money(totals.paidVal, ccy)} tone="green" />
      </section>

      {/* Payout threshold control */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green/10">
              <Target className="size-5 text-green" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">Payout threshold</h2>
              <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
                Rewards keep collecting per referrer and only become eligible for payout once their total reaches this
                amount. Set to 0 to make every reward eligible immediately.
              </p>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Amount ({ccy})</label>
              <input
                type="number"
                min={0}
                step={500}
                value={thresholdDraft}
                onChange={(e) => setThresholdDraft(e.target.value)}
                className="mt-1 w-36 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <button
              type="button"
              disabled={pending || !thresholdDirty}
              onClick={saveThreshold}
              className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green/90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-lg border border-green/30 bg-green/10 px-4 py-2.5 text-sm text-green">{notice}</p>
      )}

      <div className="mt-8 flex gap-1 border-b border-border">
        {(
          [
            ["collecting", "Collecting"],
            ["queue", "Reward queue"],
            ["payments", "Payout history"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === t ? "text-green" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {t === "collecting" && groups.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                {groups.length}
              </span>
            )}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-green" />}
          </button>
        ))}
      </div>

      {tab === "collecting" && (
        <div className="mt-4">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center">
              <PiggyBank className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No rewards are collecting right now. New referral rewards will appear here and accumulate toward the{" "}
                {money(threshold, ccy)} threshold.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {groups.map((g) => {
                const ready = threshold <= 0 || g.total >= threshold
                const pct = threshold > 0 ? Math.min(100, Math.round((g.total / threshold) * 100)) : 100
                const remaining = Math.max(0, threshold - g.total)
                return (
                  <div key={g.key} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{g.referrerName}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {g.referrerRole.replace(/_/g, " ") || "referrer"} • {g.count} member
                          {g.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      {ready ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green/15 px-2.5 py-0.5 text-xs font-semibold text-green">
                          <Check className="size-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                          Collecting
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-lg font-bold text-foreground">{money(g.total, g.currency)}</span>
                      <span className="text-xs text-muted-foreground">of {money(threshold, ccy)}</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", ready ? "bg-green" : "bg-green/60")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {ready
                        ? "Threshold reached — ready to release for payout."
                        : `${money(remaining, ccy)} more to unlock payout.`}
                    </p>

                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => doRelease(g)}
                      className={cn(
                        "mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
                        ready
                          ? "bg-green text-white hover:bg-green/90"
                          : "border border-border text-foreground hover:bg-muted",
                      )}
                    >
                      <Rocket className="size-3.5" />
                      {ready ? "Release for payout" : "Release now (override)"}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === "queue" && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
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
                {queueRewards.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No rewards in the queue yet. Rewards appear here once a referrer crosses the payout threshold.
                    </td>
                  </tr>
                )}
                {queueRewards.map((r) => (
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
                    <td className="px-5 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {["eligible", "under_review"].includes(r.status) && (
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
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
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
                    <td className="px-5 py-3">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{date(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
  tone: "amber" | "sky" | "green" | "slate"
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50",
    sky: "border-sky-200 bg-sky-50",
    green: "border-green/20 bg-green/5",
    slate: "border-border bg-muted/40",
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

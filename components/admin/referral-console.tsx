"use client"

import { useState, useTransition } from "react"
import { MousePointerClick, Share2, Ticket, Trophy, Users } from "lucide-react"
import { toggleReferralCode } from "@/app/actions/admin-referrals"
import { cn } from "@/lib/utils"

type Code = {
  id: number
  code: string
  label: string
  ownerUserId: string | null
  active: boolean
  uses: number
  createdAt: string | Date
}
type Attribution = {
  id: number
  code: string
  memberEmail: string
  membershipId: string | null
  status: string
  createdAt: string | Date
}
type RewardAgg = { status: string; count: number; total: number }
type LeaderRow = {
  referrerUserId: string | null
  referrerName: string
  referrerRole: string
  total: number
  count: number
}

export type ConsoleData = {
  stats: { codes: number; clicks: number; referrals: number }
  rewardAgg: RewardAgg[]
  leaderboard: LeaderRow[]
  codes: Code[]
  recentAttributions: Attribution[]
}

const money = (n: number) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`
const date = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })

const STATUS_STYLES: Record<string, string> = {
  eligible: "bg-amber-100 text-amber-800",
  under_review: "bg-amber-100 text-amber-800",
  approved: "bg-sky-100 text-sky-800",
  reward_eligible: "bg-sky-100 text-sky-800",
  paid: "bg-green/15 text-green",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
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

export function ReferralConsole({ data }: { data: ConsoleData }) {
  const [codes, setCodes] = useState(data.codes)
  const [pending, startTransition] = useTransition()

  const totalRewardValue = data.rewardAgg.reduce((a, r) => a + r.total, 0)

  function toggle(id: number, active: boolean) {
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)))
    startTransition(async () => {
      const res = await toggleReferralCode(id, active)
      if (!res.ok) setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, active: !active } : c)))
    })
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Referral Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor referral links, attribution, and reward value across the entire network.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Ticket} label="Active codes" value={data.stats.codes.toLocaleString("en-PK")} />
        <Stat icon={MousePointerClick} label="Total clicks" value={data.stats.clicks.toLocaleString("en-PK")} />
        <Stat icon={Users} label="Referrals" value={data.stats.referrals.toLocaleString("en-PK")} />
        <Stat icon={Share2} label="Reward value" value={money(totalRewardValue)} />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Leaderboard */}
        <section className="lg:col-span-1">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Trophy className="size-4 text-green" /> Top referrers
            </div>
            <ol className="mt-4 space-y-3">
              {data.leaderboard.length === 0 && (
                <li className="text-sm text-muted-foreground">No rewards recorded yet.</li>
              )}
              {data.leaderboard.map((row, i) => (
                <li key={row.referrerUserId ?? i} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      i === 0 ? "bg-green text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{row.referrerName || "—"}</p>
                    <p className="text-xs capitalize text-muted-foreground">{row.referrerRole.replace(/_/g, " ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{money(row.total)}</p>
                    <p className="text-xs text-muted-foreground">{row.count} rewards</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Reward breakdown */}
          <div className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">Reward pipeline</p>
            <ul className="mt-3 space-y-2">
              {data.rewardAgg.length === 0 && <li className="text-sm text-muted-foreground">No rewards yet.</li>}
              {data.rewardAgg.map((r) => (
                <li key={r.status} className="flex items-center justify-between text-sm">
                  <StatusPill status={r.status} />
                  <span className="font-semibold text-foreground">
                    {money(r.total)} <span className="font-normal text-muted-foreground">({r.count})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Codes + attributions */}
        <section className="lg:col-span-2 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-foreground">Referral codes</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Code</th>
                    <th className="px-5 py-3 font-semibold">Label</th>
                    <th className="px-5 py-3 font-semibold">Uses</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {codes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                        No referral codes generated yet.
                      </td>
                    </tr>
                  )}
                  {codes.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">{c.code}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.label || "—"}</td>
                      <td className="px-5 py-3 text-foreground">{c.uses}</td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => toggle(c.id, !c.active)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                            c.active ? "bg-green/15 text-green hover:bg-green/25" : "bg-muted text-muted-foreground hover:bg-muted/70",
                          )}
                        >
                          <span className={cn("size-1.5 rounded-full", c.active ? "bg-green" : "bg-muted-foreground")} />
                          {c.active ? "Active" : "Disabled"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-foreground">Recent attributions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Applicant</th>
                    <th className="px-5 py-3 font-semibold">Code</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recentAttributions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                        No referral attributions yet.
                      </td>
                    </tr>
                  )}
                  {data.recentAttributions.map((a) => (
                    <tr key={a.id}>
                      <td className="px-5 py-3 text-foreground">{a.memberEmail || "—"}</td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{a.code}</td>
                      <td className="px-5 py-3"><StatusPill status={a.status} /></td>
                      <td className="px-5 py-3 text-muted-foreground">{date(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-green/10">
        <Icon className="size-[18px] text-green" />
      </span>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

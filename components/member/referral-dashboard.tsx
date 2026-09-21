"use client"

import { useState } from "react"
import { Check, Copy, MousePointerClick, Share2, TrendingUp, Users, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

type Attribution = {
  id: number
  memberEmail: string
  status: string
  membershipId: string | null
  createdAt: string | Date
}
type Reward = {
  id: number
  memberEmail: string
  membershipCategory: string
  rewardAmount: number
  commissionRate: string
  currency: string
  status: string
  createdAt: string | Date
}
type Payment = {
  id: number
  finalAmount: number
  currency: string
  method: string
  reference: string | null
  status: string
  createdAt: string | Date
}

export type ReferralData = {
  code: string | null
  active: boolean
  stats: {
    clicks: number
    referrals: number
    approved: number
    totalEarned: number
    pending: number
    approvedAmount: number
    paid: number
  }
  attributions: Attribution[]
  rewards: Reward[]
  payments: Payment[]
}

const money = (n: number, ccy = "PKR") => `${ccy} ${Number(n || 0).toLocaleString("en-PK")}`
const date = (d: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—"

const STATUS_STYLES: Record<string, string> = {
  eligible: "bg-amber-100 text-amber-800",
  under_review: "bg-amber-100 text-amber-800",
  pending_eligibility: "bg-muted text-muted-2",
  approved: "bg-sky-100 text-sky-800",
  reward_eligible: "bg-sky-100 text-sky-800",
  reward_approved: "bg-sky-100 text-sky-800",
  payment_processing: "bg-indigo-100 text-indigo-800",
  paid: "bg-green/15 text-green",
  rejected: "bg-destructive/10 text-destructive",
  application_submitted: "bg-muted text-muted-2",
}

function StatusPill({ status }: { status: string }) {
  const label = status.replace(/_/g, " ")
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        STATUS_STYLES[status] ?? "bg-muted text-muted-2",
      )}
    >
      {label}
    </span>
  )
}

export function ReferralDashboard({ data }: { data: ReferralData }) {
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<"referrals" | "rewards" | "payments">("referrals")

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const link = data.code ? `${origin}/join?ref=${data.code}` : ""

  async function copyLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked — no-op
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Referrals &amp; Rewards</h1>
        <p className="mt-1 text-sm text-body">
          Share your link, track approved memberships, and follow your commission rewards from eligible to paid.
        </p>
      </header>

      {/* Share link */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-heading">
          <Share2 className="size-4 text-green" /> Your referral link
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="flex-1 truncate rounded-lg border border-line bg-muted/50 px-4 py-3 text-sm text-body">
            {link || "Generating your link…"}
          </code>
          <button
            type="button"
            onClick={copyLink}
            disabled={!link}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
              copied ? "bg-green text-white" : "bg-green text-white hover:bg-green/90",
              !link && "opacity-50",
            )}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-2">
          Code <span className="font-semibold text-body">{data.code ?? "—"}</span>. A reward becomes eligible only
          after a referred applicant&apos;s membership is officially approved and active.
        </p>
      </section>

      {/* Stats */}
      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={MousePointerClick} label="Link clicks" value={data.stats.clicks.toLocaleString("en-PK")} />
        <StatCard icon={Users} label="Referrals" value={data.stats.referrals.toLocaleString("en-PK")} />
        <StatCard icon={TrendingUp} label="Approved" value={data.stats.approved.toLocaleString("en-PK")} />
        <StatCard icon={Wallet} label="Total earned" value={money(data.stats.totalEarned)} />
      </section>

      <section className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniStat label="Pending review" value={money(data.stats.pending)} tone="amber" />
        <MiniStat label="Approved (awaiting payout)" value={money(data.stats.approvedAmount)} tone="sky" />
        <MiniStat label="Paid out" value={money(data.stats.paid)} tone="green" />
      </section>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-line">
        {(["referrals", "rewards", "payments"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-semibold capitalize transition-colors",
              tab === t ? "text-green" : "text-muted-2 hover:text-body",
            )}
          >
            {t}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-green" />}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "referrals" && <ReferralsTable rows={data.attributions} />}
        {tab === "rewards" && <RewardsTable rows={data.rewards} />}
        {tab === "payments" && <PaymentsTable rows={data.payments} />}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-mint">
        <Icon className="size-[18px] text-green" />
      </span>
      <p className="mt-3 text-2xl font-bold text-heading">{value}</p>
      <p className="text-xs font-medium text-muted-2">{label}</p>
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "amber" | "sky" | "green" }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50",
    sky: "border-sky-200 bg-sky-50",
    green: "border-green/20 bg-green/5",
  }
  return (
    <div className={cn("rounded-xl border p-4", tones[tone])}>
      <p className="text-lg font-bold text-heading">{value}</p>
      <p className="text-xs font-medium text-body">{label}</p>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-line bg-card px-4 py-10 text-center text-sm text-muted-2">{text}</div>
}

function ReferralsTable({ rows }: { rows: Attribution[] }) {
  if (!rows.length) return <EmptyRow text="No referrals yet. Share your link to get started." />
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-2">
          <tr>
            <th className="px-4 py-3 font-semibold">Applicant</th>
            <th className="px-4 py-3 font-semibold">Membership ID</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Referred</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 text-body">{r.memberEmail}</td>
              <td className="px-4 py-3 font-mono text-xs text-body">{r.membershipId ?? "—"}</td>
              <td className="px-4 py-3"><StatusPill status={r.status} /></td>
              <td className="px-4 py-3 text-muted-2">{date(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RewardsTable({ rows }: { rows: Reward[] }) {
  if (!rows.length) return <EmptyRow text="No rewards yet. Rewards appear once a referred membership is approved." />
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-2">
          <tr>
            <th className="px-4 py-3 font-semibold">Member</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">Rate</th>
            <th className="px-4 py-3 font-semibold">Reward</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 text-body">{r.memberEmail}</td>
              <td className="px-4 py-3 text-body">{r.membershipCategory}</td>
              <td className="px-4 py-3 text-muted-2">{r.commissionRate}</td>
              <td className="px-4 py-3 font-semibold text-heading">{money(r.rewardAmount, r.currency)}</td>
              <td className="px-4 py-3"><StatusPill status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentsTable({ rows }: { rows: Payment[] }) {
  if (!rows.length) return <EmptyRow text="No payouts yet. Approved rewards are paid out by the secretariat." />
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-2">
          <tr>
            <th className="px-4 py-3 font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">Method</th>
            <th className="px-4 py-3 font-semibold">Reference</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-semibold text-heading">{money(r.finalAmount, r.currency)}</td>
              <td className="px-4 py-3 text-body capitalize">{r.method || "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-body">{r.reference || "—"}</td>
              <td className="px-4 py-3"><StatusPill status={r.status} /></td>
              <td className="px-4 py-3 text-muted-2">{date(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

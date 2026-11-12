"use client"

import { useState } from "react"
import { Award, Check, Copy, Eye, Lock, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { referralUrl } from "@/lib/referral"
import type { MyReferralPerformance } from "@/app/actions/referrals"

const STATUS_LABEL: Record<string, string> = {
  invited: "Invited",
  application_started: "Started",
  application_submitted: "Submitted",
  payment_pending: "Payment pending",
  under_review: "Under review",
  approved: "Approved",
  reward_eligible: "Approved",
  reward_approved: "Approved",
  paid: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

function statusTone(status: string) {
  if (status === "paid") return "bg-green text-primary-foreground"
  if (["approved", "reward_eligible", "reward_approved"].includes(status)) return "bg-mint text-green"
  if (["rejected", "cancelled"].includes(status)) return "bg-muted text-body"
  return "bg-gold-tint text-heading"
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-card p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-body">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-heading">{value}</span>
      {hint ? <span className="text-xs text-body">{hint}</span> : null}
    </div>
  )
}

export function MyReferralPerformanceView({ data, readOnly }: { data: MyReferralPerformance; readOnly: boolean }) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null)
  const link = data.code ? referralUrl(data.code) : ""
  const s = data.stats
  const nextTarget = data.targets.find((t) => !t.achieved)
  const achievedCount = data.targets.filter((t) => t.achieved).length
  const progress = nextTarget ? Math.min(100, Math.round((s.conversions / nextTarget.goal) * 100)) : 100

  async function copy(value: string, kind: "link" | "code") {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      // Clipboard access can be blocked in embedded previews.
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-balance text-2xl font-bold text-heading">My Referral Performance</h1>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-body">
            Your referral link, the members it brought in, and how your referrals are progressing.
          </p>
        </div>
        {readOnly ? (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-body">
            <Eye className="size-3.5" aria-hidden /> Read-only view
          </span>
        ) : null}
      </header>

      <section aria-labelledby="ref-link-title" className="rounded-2xl border border-line bg-card p-5">
        <h2 id="ref-link-title" className="flex items-center gap-2 text-sm font-semibold text-heading">
          <Share2 className="size-4 text-green" aria-hidden /> Your referral link
          {!data.active && data.code ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-body">Inactive</span>
          ) : null}
        </h2>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-muted/50 px-4 py-3 text-sm text-body">
            {link || "No referral code assigned"}
          </code>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copy(link, "link")}
              disabled={!link}
              className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-green-hover disabled:opacity-50"
            >
              {copied === "link" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied === "link" ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => copy(data.code ?? "", "code")}
              disabled={!data.code}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-3 font-mono text-sm font-semibold text-heading transition-colors hover:bg-muted disabled:opacity-50"
              aria-label={`Copy referral code ${data.code ?? ""}`}
            >
              {copied === "code" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {data.code ?? "—"}
            </button>
          </div>
        </div>
        <span aria-live="polite" className="sr-only">
          {copied ? `Referral ${copied} copied` : ""}
        </span>
      </section>

      <section aria-labelledby="ref-stats-title" className="flex flex-col gap-3">
        <h2 id="ref-stats-title" className="text-sm font-semibold text-heading">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Link visits" value={s.clicks} hint={`${s.clickConversionRate}% became referrals`} />
          <Stat label="Total referrals" value={s.totalReferrals} />
          <Stat label="Registered members" value={s.registeredMembers} hint="Issued a membership ID" />
          <Stat label="Conversions" value={s.conversions} hint={`${s.conversionRate}% of referrals`} />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Pending" value={s.pending} hint="In application or review" />
          <Stat label="Approved" value={s.approved} hint="Membership approved" />
          <Stat label="Completed" value={s.completed} hint="Reward paid out" />
          <Stat label="Rejected / cancelled" value={s.closed} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section aria-labelledby="ref-targets-title" className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 lg:col-span-2">
          <h2 id="ref-targets-title" className="flex items-center gap-2 text-sm font-semibold text-heading">
            <Award className="size-4 text-green" aria-hidden /> Targets achieved
            <span className="ml-auto text-xs font-medium text-body">
              {achievedCount} of {data.targets.length}
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-body">
              <span>{nextTarget ? `Next target: ${nextTarget.goal} conversions` : "All targets achieved"}</span>
              <span className="tabular-nums">
                {s.conversions}
                {nextTarget ? ` / ${nextTarget.goal}` : ""}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Progress to next target"
            >
              <div className="h-full rounded-full bg-green" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {data.targets.map((t) => (
              <li
                key={t.goal}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-3 text-center",
                  t.achieved ? "border-green bg-mint" : "border-line bg-card",
                )}
              >
                <span className={cn("text-lg font-bold tabular-nums", t.achieved ? "text-green" : "text-body")}>{t.goal}</span>
                <span className="text-xs text-body">{t.achieved ? "Achieved" : "Locked"}</span>
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <div>
              <dt className="text-xs text-body">Rewards earned</dt>
              <dd className="font-semibold tabular-nums text-heading">{s.totalEarned.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-body">Paid out</dt>
              <dd className="font-semibold tabular-nums text-heading">{s.paidRewards.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-body">Approved</dt>
              <dd className="font-semibold tabular-nums text-heading">{s.approvedRewards.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-body">Pending</dt>
              <dd className="font-semibold tabular-nums text-heading">{s.pendingRewards.toLocaleString()}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="ref-recent-title" className="flex flex-col rounded-2xl border border-line bg-card lg:col-span-3">
          <h2 id="ref-recent-title" className="border-b border-line px-5 py-4 text-sm font-semibold text-heading">
            Recent referrals
          </h2>
          {data.recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm leading-relaxed text-body">
              No referrals yet. Share your link to start tracking sign-ups here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-body">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">Member</th>
                    <th scope="col" className="px-5 py-3 font-medium">Status</th>
                    <th scope="col" className="px-5 py-3 font-medium">Membership ID</th>
                    <th scope="col" className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="max-w-48 truncate px-5 py-3 text-heading">{r.memberEmail || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusTone(r.status))}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-body">{r.membershipId ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-body">{new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {readOnly ? (
        <p className="flex items-center gap-2 text-xs text-body">
          <Lock className="size-3.5" aria-hidden />
          Referral records, membership data and statistics are managed by Admin and Super Admin. Contact them for corrections.
        </p>
      ) : null}
    </div>
  )
}

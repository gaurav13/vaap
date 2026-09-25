"use client"

import { useMemo, useState, useTransition } from "react"
import { CheckCircle2, ChevronDown, Search, ShieldAlert, ShieldCheck, ShieldX, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MemberVotingRow, VotingStatus, RightKind } from "@/lib/voting-rights"
import { updateVotingRightAction, bulkUpdateVotingRightAction } from "@/app/actions/voting-rights"

const STATUS_META: Record<VotingStatus, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-green/10 text-green border-green/30" },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
  suspended: { label: "Suspended", className: "bg-orange-50 text-orange-700 border-orange-200" },
  revoked: { label: "Revoked", className: "bg-gray-100 text-gray-600 border-gray-300" },
}

const ACTIONS: { status: VotingStatus; label: string }[] = [
  { status: "approved", label: "Approve" },
  { status: "suspended", label: "Suspend" },
  { status: "revoked", label: "Revoke" },
  { status: "rejected", label: "Reject" },
  { status: "pending", label: "Reset to pending" },
]

function StatusPill({ status }: { status: VotingStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", meta.className)}>
      {meta.label}
    </span>
  )
}

function RightCell({
  memberId,
  kind,
  status,
  approvedBy,
  onDone,
}: {
  memberId: number
  kind: RightKind
  status: VotingStatus
  approvedBy: string
  onDone: (msg: string, ok: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  function apply(next: VotingStatus) {
    setOpen(false)
    if (next === status) return
    start(async () => {
      const res = await updateVotingRightAction({ memberId, kind, status: next })
      onDone(res.ok ? "Voting right updated." : res.error, res.ok)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <StatusPill status={status} />
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-medium text-navy transition-colors hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Saving..." : "Change"}
          <ChevronDown className="size-3" />
        </button>
        {open ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-line bg-white py-1 shadow-lg">
              {ACTIONS.map((a) => (
                <button
                  key={a.status}
                  type="button"
                  onClick={() => apply(a.status)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted",
                    a.status === status ? "font-semibold text-green" : "text-navy",
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

type StatusFilter = "all" | VotingStatus

export function VotingRightsManager({ rows }: { rows: MemberVotingRow[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [bulkPending, startBulk] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.name} ${r.email} ${r.membershipId} ${r.organization ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filter !== "all" && r.electionStatus !== filter && r.governanceStatus !== filter) return false
      return true
    })
  }, [rows, query, filter])

  function flash(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === filtered.length) return new Set()
      return new Set(filtered.map((r) => r.memberId))
    })
  }

  function runBulk(kind: RightKind, status: VotingStatus) {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    startBulk(async () => {
      const res = await bulkUpdateVotingRightAction({ memberIds: ids, kind, status })
      if (res.ok) {
        flash(`Updated ${res.count} member${res.count === 1 ? "" : "s"}.`, true)
        setSelected(new Set())
      } else {
        flash(res.error, false)
      }
    })
  }

  const counts = useMemo(() => {
    let electionApproved = 0
    let govApproved = 0
    let pending = 0
    for (const r of rows) {
      if (r.electionStatus === "approved") electionApproved++
      if (r.governanceStatus === "approved") govApproved++
      if (r.electionStatus === "pending" || r.governanceStatus === "pending") pending++
    }
    return { electionApproved, govApproved, pending }
  }, [rows])

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard icon={ShieldCheck} label="Election voters" value={counts.electionApproved} tone="green" />
        <SummaryCard icon={CheckCircle2} label="Governance voters" value={counts.govApproved} tone="navy" />
        <SummaryCard icon={Clock} label="Awaiting review" value={counts.pending} tone="amber" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members..."
            className="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm outline-none focus:border-green"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", "approved", "pending", "suspended", "revoked", "rejected"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-navy text-white" : "text-navy hover:bg-muted",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-navy/20 bg-navy/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-navy">{selected.size} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Election:</span>
            <BulkBtn onClick={() => runBulk("election", "approved")} disabled={bulkPending} tone="green">
              Approve
            </BulkBtn>
            <BulkBtn onClick={() => runBulk("election", "revoked")} disabled={bulkPending} tone="muted">
              Revoke
            </BulkBtn>
            <span className="ml-2 text-xs font-semibold uppercase text-muted-foreground">Governance:</span>
            <BulkBtn onClick={() => runBulk("governance", "approved")} disabled={bulkPending} tone="green">
              Approve
            </BulkBtn>
            <BulkBtn onClick={() => runBulk("governance", "revoked")} disabled={bulkPending} tone="muted">
              Revoke
            </BulkBtn>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-line bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-3 py-3">Member</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Election right</th>
              <th className="px-3 py-3">Governance right</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.memberId} className="border-b border-line last:border-0 hover:bg-muted/30">
                <td className="px-3 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={selected.has(r.memberId)}
                    onChange={() => toggle(r.memberId)}
                    aria-label={`Select ${r.name}`}
                  />
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="font-semibold text-navy">{r.name || "Unnamed"}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                  {r.membershipId ? (
                    <div className="text-xs text-muted-foreground">{r.membershipId}</div>
                  ) : null}
                  {!r.goodStanding ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-orange-600">
                      <ShieldAlert className="size-3" /> Not in good standing
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 align-top">
                  <span className="capitalize text-navy">{r.category || "—"}</span>
                  <div className="text-xs capitalize text-muted-foreground">{r.membershipStatus}</div>
                </td>
                <td className="px-3 py-3 align-top">
                  <RightCell
                    memberId={r.memberId}
                    kind="election"
                    status={r.electionStatus}
                    approvedBy={r.electionApprovedBy}
                    onDone={flash}
                  />
                </td>
                <td className="px-3 py-3 align-top">
                  <RightCell
                    memberId={r.memberId}
                    kind="governance"
                    status={r.governanceStatus}
                    approvedBy={r.governanceApprovedBy}
                    onDone={flash}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No members match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg",
            toast.ok ? "bg-green text-white" : "bg-red-600 text-white",
          )}
        >
          {toast.ok ? <ShieldCheck className="size-4" /> : <ShieldX className="size-4" />}
          {toast.msg}
        </div>
      ) : null}
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShieldCheck
  label: string
  value: number
  tone: "green" | "navy" | "amber"
}) {
  const toneClass =
    tone === "green" ? "text-green" : tone === "navy" ? "text-navy" : "text-amber-600"
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
      <div className={cn("rounded-lg bg-muted p-2", toneClass)}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-navy">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

function BulkBtn({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
  tone: "green" | "muted"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
        tone === "green" ? "bg-green text-white hover:bg-green/90" : "border border-line text-navy hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}

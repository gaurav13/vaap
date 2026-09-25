"use client"

import { useMemo, useState, useTransition } from "react"
import {
  Check,
  ChevronDown,
  Clock,
  Landmark,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Vote,
  X,
} from "lucide-react"
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

const MORE_ACTIONS: { status: VotingStatus; label: string }[] = [
  { status: "approved", label: "Approve" },
  { status: "rejected", label: "Reject" },
  { status: "suspended", label: "Suspend" },
  { status: "revoked", label: "Revoke" },
  { status: "pending", label: "Reset to pending" },
]

const RIGHT_TABS: { kind: RightKind; label: string; description: string; icon: typeof Vote }[] = [
  {
    kind: "election",
    label: "Election Voting",
    description: "Formal VAAP elections — office bearers and committee seats.",
    icon: Vote,
  },
  {
    kind: "governance",
    label: "Governance & Proposal Voting",
    description: "Governance proposals, projects, and DAO-style decisions.",
    icon: Landmark,
  },
]

const STATUS_FILTERS: VotingStatus[] = ["pending", "approved", "rejected", "suspended", "revoked"]

type StatusFilter = "all" | VotingStatus
type BulkScope = "current" | "both"

function statusOf(row: MemberVotingRow, kind: RightKind): VotingStatus {
  return kind === "election" ? row.electionStatus : row.governanceStatus
}

function StatusPill({ status }: { status: VotingStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}

function formatDate(value: Date | string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

function RowDecision({
  row,
  kind,
  onDone,
  onRejectRequest,
}: {
  row: MemberVotingRow
  kind: RightKind
  onDone: (msg: string, ok: boolean) => void
  onRejectRequest: (memberIds: number[], scope: BulkScope) => void
}) {
  const status = statusOf(row, kind)
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  function apply(next: VotingStatus) {
    setOpen(false)
    if (next === status) return
    if (next === "rejected") {
      onRejectRequest([row.memberId], "current")
      return
    }
    start(async () => {
      const res = await updateVotingRightAction({ memberId: row.memberId, kind, status: next })
      onDone(res.ok ? `${row.name || "Member"}: ${STATUS_META[next].label.toLowerCase()}.` : res.error, res.ok)
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status !== "approved" ? (
        <button
          type="button"
          onClick={() => apply("approved")}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md bg-green px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green/90 disabled:opacity-50"
        >
          <Check className="size-3.5" aria-hidden />
          Accept
        </button>
      ) : null}
      {status === "pending" ? (
        <button
          type="button"
          onClick={() => apply("rejected")}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          <X className="size-3.5" aria-hidden />
          Reject
        </button>
      ) : null}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={pending}
          aria-haspopup="menu"
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1.5 text-xs font-medium text-navy transition-colors hover:bg-muted disabled:opacity-50"
        >
          {pending ? "Saving..." : "More"}
          <ChevronDown className="size-3" aria-hidden />
        </button>
        {open ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
            <div role="menu" className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-line bg-white py-1 shadow-lg">
              {MORE_ACTIONS.map((a) => (
                <button
                  key={a.status}
                  type="button"
                  role="menuitem"
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

export function VotingRightsManager({ rows }: { rows: MemberVotingRow[] }) {
  const [kind, setKind] = useState<RightKind>("election")
  const [filter, setFilter] = useState<StatusFilter>("pending")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkScope, setBulkScope] = useState<BulkScope>("current")
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [bulkPending, startBulk] = useTransition()
  const [rejectTarget, setRejectTarget] = useState<{ ids: number[]; scope: BulkScope } | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const activeTab = RIGHT_TABS.find((t) => t.kind === kind)!

  const countsByKind = useMemo(() => {
    const make = () => ({ all: 0, pending: 0, approved: 0, rejected: 0, suspended: 0, revoked: 0 })
    const result = { election: make(), governance: make() }
    for (const r of rows) {
      result.election.all++
      result.election[r.electionStatus]++
      result.governance.all++
      result.governance[r.governanceStatus]++
    }
    return result
  }, [rows])

  const counts = countsByKind[kind]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter !== "all" && statusOf(r, kind) !== filter) return false
      if (q) {
        const hay = `${r.name} ${r.email} ${r.membershipId} ${r.organization ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, query, filter, kind])

  const visibleSelected = filtered.filter((r) => selected.has(r.memberId)).map((r) => r.memberId)

  function flash(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function switchKind(next: RightKind) {
    setKind(next)
    setSelected(new Set())
  }

  function switchFilter(next: StatusFilter) {
    setFilter(next)
    setSelected(new Set())
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
      const allVisibleSelected = filtered.length > 0 && filtered.every((r) => prev.has(r.memberId))
      return allVisibleSelected ? new Set() : new Set(filtered.map((r) => r.memberId))
    })
  }

  function runBulk(ids: number[], status: VotingStatus, scope: BulkScope, reason?: string) {
    if (ids.length === 0) return
    const kinds: RightKind[] = scope === "both" ? ["election", "governance"] : [kind]
    startBulk(async () => {
      for (const k of kinds) {
        const res = await bulkUpdateVotingRightAction({ memberIds: ids, kind: k, status, reason })
        if (!res.ok) {
          flash(res.error, false)
          return
        }
      }
      const scopeLabel =
        scope === "both" ? "election and governance voting" : activeTab.label.toLowerCase()
      flash(
        `${STATUS_META[status].label} ${scopeLabel} for ${ids.length} member${ids.length === 1 ? "" : "s"}.`,
        true,
      )
      setSelected(new Set())
    })
  }

  function requestReject(ids: number[], scope: BulkScope) {
    if (ids.length === 0) return
    setRejectReason("")
    setRejectTarget({ ids, scope })
  }

  function confirmReject() {
    if (!rejectTarget) return
    const { ids, scope } = rejectTarget
    setRejectTarget(null)
    runBulk(ids, "rejected", scope, rejectReason)
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.memberId))
  const pendingIds = filtered.filter((r) => statusOf(r, kind) === "pending").map((r) => r.memberId)

  return (
    <div>
      {/* Right selector */}
      <div role="tablist" aria-label="Voting category" className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {RIGHT_TABS.map((tab) => {
          const Icon = tab.icon
          const active = tab.kind === kind
          const c = countsByKind[tab.kind]
          return (
            <button
              key={tab.kind}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchKind(tab.kind)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                active ? "border-green bg-green/5 ring-1 ring-green" : "border-line bg-white hover:bg-muted/40",
              )}
            >
              <div className={cn("rounded-lg p-2", active ? "bg-green text-white" : "bg-muted text-navy")}>
                <Icon className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-navy">{tab.label}</span>
                  {c.pending > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      <Clock className="size-3" aria-hidden />
                      {c.pending} pending
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{tab.description}</p>
                <p className="mt-2 text-xs text-navy">
                  <span className="font-semibold">{c.approved}</span> approved ·{" "}
                  <span className="font-semibold">{c.rejected}</span> rejected
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by status">
          {(["all", ...STATUS_FILTERS] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => switchFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-navy text-white" : "text-navy hover:bg-muted",
              )}
            >
              {f === "pending" ? "Awaiting approval" : f}
              <span
                className={cn(
                  "rounded px-1 text-[11px] tabular-nums",
                  filter === f ? "bg-white/20" : "bg-muted text-muted-foreground",
                )}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <label htmlFor="voting-rights-search" className="sr-only">
            Search members
          </label>
          <input
            id="voting-rights-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, membership ID..."
            className="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm outline-none focus:border-green"
          />
        </div>
      </div>

      {/* Bulk action bar */}
      <div
        className={cn(
          "mb-4 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between",
          visibleSelected.length > 0 ? "border-navy/20 bg-navy/5" : "border-line bg-muted/30",
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-navy">
            {visibleSelected.length > 0
              ? `${visibleSelected.length} selected`
              : "Select members to accept or reject in bulk"}
          </span>
          {pendingIds.length > 0 && visibleSelected.length === 0 ? (
            <button
              type="button"
              onClick={() => setSelected(new Set(pendingIds))}
              className="text-xs font-semibold text-green underline-offset-2 hover:underline"
            >
              Select all {pendingIds.length} pending
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-navy">
            <span className="font-medium">Apply to:</span>
            <select
              value={bulkScope}
              onChange={(e) => setBulkScope(e.target.value as BulkScope)}
              className="rounded-md border border-line bg-white px-2 py-1 text-xs outline-none focus:border-green"
            >
              <option value="current">{activeTab.label} only</option>
              <option value="both">Both election and governance</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => runBulk(visibleSelected, "approved", bulkScope)}
            disabled={bulkPending || visibleSelected.length === 0}
            className="inline-flex items-center gap-1 rounded-md bg-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green/90 disabled:opacity-40"
          >
            <Check className="size-3.5" aria-hidden />
            Bulk accept
          </button>
          <button
            type="button"
            onClick={() => requestReject(visibleSelected, bulkScope)}
            disabled={bulkPending || visibleSelected.length === 0}
            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
          >
            <X className="size-3.5" aria-hidden />
            Bulk reject
          </button>
          <button
            type="button"
            onClick={() => runBulk(visibleSelected, "revoked", bulkScope)}
            disabled={bulkPending || visibleSelected.length === 0}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-muted disabled:opacity-40"
          >
            Revoke
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <caption className="sr-only">{activeTab.label} approvals</caption>
          <thead>
            <tr className="border-b border-line bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  aria-label="Select all visible members"
                />
              </th>
              <th className="px-3 py-3">Member</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">{kind === "election" ? "Election voting" : "Governance voting"}</th>
              <th className="px-3 py-3">{kind === "election" ? "Governance voting" : "Election voting"}</th>
              <th className="px-3 py-3 text-right">Decision</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const status = statusOf(r, kind)
              const otherKind: RightKind = kind === "election" ? "governance" : "election"
              const decidedBy = kind === "election" ? r.electionApprovedBy : r.governanceApprovedBy
              const decidedAt = kind === "election" ? r.electionApprovedAt : r.governanceApprovedAt
              const reason = kind === "election" ? r.electionReason : r.governanceReason
              return (
                <tr
                  key={r.memberId}
                  className={cn(
                    "border-b border-line last:border-0",
                    selected.has(r.memberId) ? "bg-green/5" : "hover:bg-muted/30",
                  )}
                >
                  <td className="px-3 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={selected.has(r.memberId)}
                      onChange={() => toggle(r.memberId)}
                      aria-label={`Select ${r.name || r.email}`}
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="font-semibold text-navy">{r.name || "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                    {r.membershipId ? <div className="text-xs text-muted-foreground">{r.membershipId}</div> : null}
                    {!r.goodStanding ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-orange-600">
                        <ShieldAlert className="size-3" aria-hidden /> Not in good standing
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className="capitalize text-navy">{r.category || "—"}</span>
                    <div className="text-xs capitalize text-muted-foreground">{r.membershipStatus}</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <StatusPill status={status} />
                    {status !== "pending" && (decidedBy || decidedAt) ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {decidedBy ? `by ${decidedBy}` : ""}
                        {decidedBy && decidedAt ? " · " : ""}
                        {formatDate(decidedAt)}
                      </div>
                    ) : null}
                    {reason ? (
                      <div className="mt-1 max-w-[16rem] text-xs italic text-muted-foreground">
                        &ldquo;{reason}&rdquo;
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <StatusPill status={statusOf(r, otherKind)} />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <RowDecision row={r} kind={kind} onDone={flash} onRejectRequest={requestReject} />
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  {filter === "pending"
                    ? `No members are awaiting ${activeTab.label.toLowerCase()} approval.`
                    : "No members match your filters."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Reject dialog */}
      {rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 id="reject-title" className="text-lg font-bold text-navy">
              Reject {rejectTarget.ids.length} member{rejectTarget.ids.length === 1 ? "" : "s"}?
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {rejectTarget.scope === "both"
                ? "Election and governance voting will both be rejected."
                : `${activeTab.label} will be rejected.`}{" "}
              The member will not be able to vote until approved.
            </p>
            <label htmlFor="reject-reason" className="mt-4 block text-sm font-medium text-navy">
              Reason <span className="font-normal text-muted-foreground">(optional, saved to audit log)</span>
            </label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Membership dues outstanding"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-md border border-line px-4 py-2 text-sm font-medium text-navy hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg",
            toast.ok ? "bg-green text-white" : "bg-red-600 text-white",
          )}
        >
          {toast.ok ? <ShieldCheck className="size-4" aria-hidden /> : <ShieldX className="size-4" aria-hidden />}
          {toast.msg}
        </div>
      ) : null}
    </div>
  )
}

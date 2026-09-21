"use client"

import { useLayoutEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react"
import {
  Ban,
  BookUser,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Vote,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ENTITIES } from "@/lib/cms/entities"
import {
  saveMember,
  setMemberStatus,
  setMemberVoting,
  deleteMembers,
  restoreMembers,
  purgeMembers,
  bulkSetStatus,
  importMembers,
  type MemberInput,
} from "@/app/actions/members"

type Member = {
  id: number
  membershipId: string
  name: string
  email: string
  organization: string | null
  category: string
  status: string
  votingEligible: boolean
  goodStanding: boolean
  joinedAt: string
  expiresAt: string | null
  deletedAt?: string | null
}

type Stats = {
  total: number
  pending: number
  active: number
  expiringSoon: number
  newThisMonth: number
}

const CATEGORIES = ENTITIES.members.fields.find((f) => f.name === "category")?.options ?? []
const PAGE_SIZE = 10

const CATEGORY_STYLE: Record<string, string> = {
  Corporate: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  International: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  Startup: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Professional: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Student: "bg-pink-50 text-pink-700 ring-1 ring-pink-200",
  "Media & Influencer": "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  "Verified Community": "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  suspended: "bg-red-50 text-red-600 ring-1 ring-red-200",
  expired: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtInput(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toISOString().slice(0, 10)
}

export function MembersAdmin({ items, trashed = [], stats }: { items: Member[]; trashed?: Member[]; stats: Stats }) {
  const [query, setQuery] = useState("")
  const [showTrash, setShowTrash] = useState(false)
  const [tab, setTab] = useState("All")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [votingFilter, setVotingFilter] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<Member | null | undefined>(undefined) // undefined = closed, null = new
  const [importOpen, setImportOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of items) map[m.category] = (map[m.category] ?? 0) + 1
    return map
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((m) => {
      if (tab !== "All" && m.category !== tab) return false
      if (categoryFilter && m.category !== categoryFilter) return false
      if (statusFilter && m.status !== statusFilter) return false
      if (votingFilter === "eligible" && !m.votingEligible) return false
      if (votingFilter === "non" && m.votingEligible) return false
      if (q) {
        const hay = `${m.name} ${m.email} ${m.organization ?? ""} ${m.membershipId}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [items, tab, query, categoryFilter, statusFilter, votingFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function resetToFirstPage() {
    setPage(1)
    setSelected(new Set())
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectPage() {
    const ids = pageRows.map((r) => r.id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  function run(fn: () => Promise<unknown>) {
    startTransition(() => {
      fn()
    })
  }

  function exportCsv() {
    const header = ["membershipId", "name", "email", "organization", "category", "status", "votingEligible", "goodStanding", "joinedAt", "expiresAt"]
    const lines = filtered.map((m) =>
      [
        m.membershipId,
        m.name,
        m.email,
        m.organization ?? "",
        m.category,
        m.status,
        m.votingEligible,
        m.goodStanding,
        fmtInput(m.joinedAt),
        fmtInput(m.expiresAt),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    )
    const csv = [header.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `vaap-members-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedIds = [...selected]

  return (
    <div className="space-y-6">
      {/* Breadcrumb + heading */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <nav className="flex items-center gap-1.5 text-sm text-muted-2">
            <span>Dashboard</span>
            <ChevronRight className="size-3.5" />
            <span className="font-medium text-heading">Members</span>
          </nav>
          <h1 className="mt-1 font-serif text-3xl font-bold text-heading">Members</h1>
          <p className="mt-1 text-sm text-muted-2">
            Manage all VAAP members, verify documents, update status and manage voting eligibility.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
          >
            <Plus className="size-4" /> Add Member
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-surface"
          >
            <Download className="size-4" /> Export
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-surface"
          >
            <Upload className="size-4" /> Import
          </button>
          <button
            type="button"
            onClick={() => setShowTrash((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
              showTrash
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-line bg-white text-heading hover:bg-surface",
            )}
          >
            <Trash2 className="size-4" /> Trash ({trashed.length})
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={<Users className="size-5" />} tone="green" label="Total Members" value={stats.total} sub="All registered" />
        <StatCard icon={<FileText className="size-5" />} tone="blue" label="Pending Applications" value={stats.pending} sub="Awaiting review" />
        <StatCard icon={<CheckCircle2 className="size-5" />} tone="green" label="Active Members" value={stats.active} sub="Current members" />
        <StatCard icon={<Clock className="size-5" />} tone="amber" label="Expiring Soon" value={stats.expiringSoon} sub="Next 30 days" />
        <StatCard icon={<UserPlus className="size-5" />} tone="green" label="New This Month" value={stats.newThisMonth} sub="New members" />
      </div>

      {/* Card: tabs + filters + table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-line px-3 pt-2">
          <TabButton active={tab === "All"} onClick={() => { setTab("All"); resetToFirstPage() }}>
            All Members ({items.length})
          </TabButton>
          {CATEGORIES.map((c) => (
            <TabButton key={c} active={tab === c} onClick={() => { setTab(c); resetToFirstPage() }}>
              {c} ({categoryCounts[c] ?? 0})
            </TabButton>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetToFirstPage() }}
              placeholder="Search members by name, company, email..."
              className="w-full rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-heading outline-none placeholder:text-muted-2 focus:border-green focus:ring-2 focus:ring-green/20"
            />
          </div>
          <SelectFilter
            value={categoryFilter}
            onChange={(v) => { setCategoryFilter(v); resetToFirstPage() }}
            placeholder="All Categories"
            options={CATEGORIES}
          />
          <SelectFilter
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); resetToFirstPage() }}
            placeholder="All Statuses"
            options={["active", "suspended", "expired"]}
          />
          <SelectFilter
            value={votingFilter}
            onChange={(v) => { setVotingFilter(v); resetToFirstPage() }}
            placeholder="All Voting Status"
            options={[
              { value: "eligible", label: "Eligible" },
              { value: "non", label: "Non-Voting" },
            ]}
          />
          {(categoryFilter || statusFilter || votingFilter || query) && (
            <button
              type="button"
              onClick={() => { setCategoryFilter(""); setStatusFilter(""); setVotingFilter(""); setQuery(""); resetToFirstPage() }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-muted-2 hover:bg-surface"
            >
              <Filter className="size-4" /> Clear
            </button>
          )}
        </div>

        {/* Bulk bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-mint px-4 py-2.5">
            <span className="text-sm font-medium text-navy">{selectedIds.length} selected</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(async () => { await bulkSetStatus(selectedIds, "active"); setSelected(new Set()) })}
              className="rounded-md border border-green-border bg-white px-2.5 py-1 text-xs font-semibold text-green hover:bg-mint-2"
            >
              Activate
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(async () => { await bulkSetStatus(selectedIds, "suspended"); setSelected(new Set()) })}
              className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-semibold text-heading hover:bg-surface"
            >
              Suspend
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(async () => { await deleteMembers(selectedIds); setSelected(new Set()) })}
              className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Move to trash
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface/60 text-xs uppercase tracking-wide text-muted-2">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                    onChange={toggleSelectPage}
                    className="size-4 rounded border-line accent-green"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Organization</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Membership Status</th>
                <th className="px-4 py-3 font-semibold">Voting Status</th>
                <th className="px-4 py-3 font-semibold">Join Date</th>
                <th className="px-4 py-3 font-semibold">Expiry Date</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((m) => (
                <tr key={m.id} className="border-b border-line-light last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${m.name}`}
                      checked={selected.has(m.id)}
                      onChange={() => toggleSelect(m.id)}
                      className="size-4 rounded border-line accent-green"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                        {initials(m.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-heading">{m.name}</p>
                        <p className="truncate text-xs text-muted-2">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-body">{m.organization || "Individual"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", CATEGORY_STYLE[m.category] ?? "bg-slate-100 text-slate-600 ring-1 ring-slate-200")}>
                      {m.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", STATUS_STYLE[m.status] ?? STATUS_STYLE.expired)}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        m.votingEligible ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
                      )}
                    >
                      {m.votingEligible ? "Eligible" : "Non-Voting"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-body">{fmtDate(m.joinedAt)}</td>
                  <td className="px-4 py-3 text-body">{fmtDate(m.expiresAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <RowMenu
                      member={m}
                      pending={pending}
                      onEdit={() => setEditing(m)}
                      onStatus={(s) => run(() => setMemberStatus(m.id, s))}
                      onVoting={() => run(() => setMemberVoting(m.id, !m.votingEligible))}
                      onDelete={() => run(() => deleteMembers([m.id]))}
                    />
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <BookUser className="mx-auto size-8 text-muted-2/60" />
                    <p className="mt-2 text-sm font-medium text-heading">No members found</p>
                    <p className="text-xs text-muted-2">Try adjusting your filters, or add a new member.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row">
          <p className="text-sm text-muted-2">
            {filtered.length === 0
              ? "No members"
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1} to ${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} members`}
          </p>
          <div className="flex items-center gap-1">
            <PageBtn disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft className="size-4" />
            </PageBtn>
            {pageNumbers(currentPage, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`e${i}`} className="px-2 text-sm text-muted-2">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    "size-8 rounded-md text-sm font-medium",
                    p === currentPage ? "bg-green text-white" : "border border-line bg-white text-heading hover:bg-surface",
                  )}
                >
                  {p}
                </button>
              ),
            )}
            <PageBtn disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
              <ChevronRight className="size-4" />
            </PageBtn>
          </div>
        </div>
      </div>

      {showTrash && (
        <div className="overflow-hidden rounded-xl border border-red-200 bg-white">
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-3">
            <Trash2 className="size-4 text-red-600" />
            <h2 className="font-serif text-lg font-bold text-red-700">Deleted members</h2>
            <span className="text-sm text-red-600/80">— restore to bring back, or permanently delete</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface/60 text-xs uppercase tracking-wide text-muted-2">
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Deleted</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trashed.map((m) => (
                  <tr key={m.id} className="border-b border-line-light last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">
                          {initials(m.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-heading">{m.name}</p>
                          <p className="truncate text-xs text-muted-2">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-body">{m.organization || "Individual"}</td>
                    <td className="px-4 py-3 text-body">{m.category}</td>
                    <td className="px-4 py-3 text-body">{fmtDate(m.deletedAt ?? null)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => restoreMembers([m.id]))}
                          className="inline-flex items-center gap-1.5 rounded-md border border-green-border bg-white px-2.5 py-1 text-xs font-semibold text-green hover:bg-mint-2 disabled:opacity-50"
                        >
                          <RotateCcw className="size-3.5" /> Restore
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => { if (confirm(`Permanently delete ${m.name}? This cannot be undone.`)) run(() => purgeMembers([m.id])) }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" /> Delete forever
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {trashed.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Trash2 className="mx-auto size-8 text-muted-2/60" />
                      <p className="mt-2 text-sm font-medium text-heading">Trash is empty</p>
                      <p className="text-xs text-muted-2">Deleted members will appear here and can be restored.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing !== undefined && (
        <MemberDialog
          member={editing}
          pending={pending}
          onClose={() => setEditing(undefined)}
          onSave={(input) =>
            run(async () => {
              const res = await saveMember(editing?.id ?? null, input)
              if (res.ok) setEditing(undefined)
              else alert(res.error)
            })
          }
        />
      )}

      {importOpen && (
        <ImportDialog
          pending={pending}
          onClose={() => setImportOpen(false)}
          onImport={(rows) =>
            run(async () => {
              const res = await importMembers(rows)
              setImportOpen(false)
              if (res.ok) alert(`Imported ${res.created} member(s).`)
            })
          }
        />
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number
  sub: string
  tone: "green" | "blue" | "amber"
}) {
  const toneClass =
    tone === "green" ? "bg-mint text-green" : tone === "blue" ? "bg-sky-50 text-sky-600" : "bg-amber-50 text-amber-600"
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <span className={cn("flex size-10 items-center justify-center rounded-lg", toneClass)}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-heading">{value.toLocaleString()}</p>
      <p className="text-sm font-medium text-heading">{label}</p>
      <p className="text-xs text-muted-2">{sub}</p>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
        active ? "border-green text-green" : "border-transparent text-muted-2 hover:text-heading",
      )}
    >
      {children}
    </button>
  )
}

type Option = string | { value: string; label: string }

function SelectFilter({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: Option[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-line bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value
          const label = typeof o === "string" ? o : o.label
          return (
            <option key={val} value={val} className="capitalize">
              {label}
            </option>
          )
        })}
      </select>
      <ChevronRight className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 rotate-90 text-muted-2" />
    </div>
  )
}

function RowMenu({
  member,
  pending,
  onEdit,
  onStatus,
  onVoting,
  onDelete,
}: {
  member: Member
  pending: boolean
  onEdit: () => void
  onStatus: (s: "active" | "suspended" | "expired") => void
  onVoting: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number; flipUp: boolean }>({ top: 0, left: 0, flipUp: false })

  useLayoutEffect(() => {
  if (!open) return
  function place() {
  const el = btnRef.current
  if (!el) return
  const r = el.getBoundingClientRect()
  const menuW = 208 // w-52
  const menuH = 260 // approx height
  const flipUp = r.bottom + menuH > window.innerHeight - 8
  setCoords({
  top: flipUp ? r.top - menuH - 4 : r.bottom + 4,
  left: Math.max(8, r.right - menuW),
  flipUp,
  })
  }
  place()
  window.addEventListener("scroll", place, true)
  window.addEventListener("resize", place)
  return () => {
  window.removeEventListener("scroll", place, true)
  window.removeEventListener("resize", place)
  }
  }, [open])

  return (
  <div className="inline-block text-left">
  <button
  ref={btnRef}
  type="button"
  aria-label="Member actions"
  onClick={() => setOpen((o) => !o)}
  className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-white text-muted-2 transition-colors hover:bg-surface hover:text-heading"
  >
  <MoreHorizontal className="size-5" />
  </button>
  {open && (
  <>
  <button type="button" aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} tabIndex={-1} />
  <div
  style={{ position: "fixed", top: coords.top, left: coords.left }}
  className="z-50 w-52 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg">
            <MenuItem onClick={() => { setOpen(false); onEdit() }} icon={<Pencil className="size-4" />}>
              Edit member
            </MenuItem>
            <MenuItem onClick={() => { setOpen(false); onVoting() }} icon={<Vote className="size-4" />} disabled={pending}>
              {member.votingEligible ? "Revoke voting eligibility" : "Approve for voting"}
            </MenuItem>
            {member.status !== "active" ? (
              <MenuItem onClick={() => { setOpen(false); onStatus("active") }} icon={<CheckCircle2 className="size-4" />} disabled={pending}>
                Set active
              </MenuItem>
            ) : (
              <MenuItem onClick={() => { setOpen(false); onStatus("suspended") }} icon={<Ban className="size-4" />} disabled={pending}>
                Suspend member
              </MenuItem>
            )}
            <MenuItem onClick={() => { setOpen(false); onStatus("expired") }} icon={<RotateCcw className="size-4" />} disabled={pending}>
              Mark expired
            </MenuItem>
            <div className="my-1 border-t border-line" />
            <MenuItem
              onClick={() => { setOpen(false); if (confirm(`Move ${member.name} to trash? You can restore them later.`)) onDelete() }}
              icon={<Trash2 className="size-4" />}
              danger
              disabled={pending}
            >
              Move to trash
            </MenuItem>
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({
  onClick,
  icon,
  children,
  danger,
  disabled,
}: {
  onClick: () => void
  icon: ReactNode
  children: ReactNode
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:opacity-50",
        danger ? "text-red-600 hover:bg-red-50" : "text-heading hover:bg-surface",
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function PageBtn({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md border border-line bg-white text-heading hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (current > 3) pages.push("...")
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-xl border border-line bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-heading">{title}</h2>
            {subtitle && <p className="text-sm text-muted-2">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-2 hover:bg-surface hover:text-heading">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function MemberDialog({
  member,
  pending,
  onClose,
  onSave,
}: {
  member: Member | null
  pending: boolean
  onClose: () => void
  onSave: (input: MemberInput) => void
}) {
  const [form, setForm] = useState<MemberInput>({
    name: member?.name ?? "",
    email: member?.email ?? "",
    membershipId: member?.membershipId ?? "",
    organization: member?.organization ?? "",
    category: member?.category ?? CATEGORIES[0] ?? "Verified Community",
    status: member?.status ?? "active",
    votingEligible: member?.votingEligible ?? false,
    goodStanding: member?.goodStanding ?? true,
    joinedAt: member ? fmtInput(member.joinedAt) : fmtInput(new Date().toISOString()),
    expiresAt: member ? fmtInput(member.expiresAt) : "",
  })

  function set<K extends keyof MemberInput>(k: K, v: MemberInput[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  return (
    <ModalShell
      title={member ? "Edit member" : "Add member"}
      subtitle={member ? member.membershipId : "Create a new verified member record"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onSave(form) }}
        className="space-y-4 px-5 py-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email" required>
            <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Membership ID" hint="Leave blank to auto-generate">
            <input value={form.membershipId} onChange={(e) => set("membershipId", e.target.value)} placeholder="VAAP-2025-0000" className={inputCls} />
          </Field>
          <Field label="Organization">
            <input value={form.organization ?? ""} onChange={(e) => set("organization", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={cn(inputCls, "capitalize")}>
              {["active", "suspended", "expired"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Join date">
            <input type="date" value={form.joinedAt ?? ""} onChange={(e) => set("joinedAt", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Expiry date">
            <input type="date" value={form.expiresAt ?? ""} onChange={(e) => set("expiresAt", e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-5 pt-1">
          <label className="flex items-center gap-2 text-sm font-medium text-heading">
            <input type="checkbox" checked={form.votingEligible} onChange={(e) => set("votingEligible", e.target.checked)} className="size-4 rounded border-line accent-green" />
            Voting eligible
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-heading">
            <input type="checkbox" checked={form.goodStanding} onChange={(e) => set("goodStanding", e.target.checked)} className="size-4 rounded border-line accent-green" />
            Good standing
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-heading hover:bg-surface">
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-hover disabled:opacity-60"
          >
            <ShieldCheck className="size-4" /> {member ? "Save changes" : "Create member"}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function ImportDialog({
  pending,
  onClose,
  onImport,
}: {
  pending: boolean
  onClose: () => void
  onImport: (rows: MemberInput[]) => void
}) {
  const [text, setText] = useState("")
  const [error, setError] = useState("")

  function parseAndImport() {
    setError("")
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) {
      setError("Provide a header row plus at least one data row.")
      return
    }
    const header = splitCsvLine(lines[0]).map((h) => h.trim())
    const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase())
    const nameI = idx("name")
    const emailI = idx("email")
    if (nameI === -1 || emailI === -1) {
      setError("CSV must include at least 'name' and 'email' columns.")
      return
    }
    const rows: MemberInput[] = lines.slice(1).map((line) => {
      const cells = splitCsvLine(line)
      const get = (n: string) => {
        const i = idx(n)
        return i === -1 ? "" : (cells[i] ?? "").trim()
      }
      return {
        name: cells[nameI]?.trim() ?? "",
        email: cells[emailI]?.trim() ?? "",
        membershipId: get("membershipId"),
        organization: get("organization"),
        category: get("category") || "Verified Community",
        status: get("status") || "active",
        votingEligible: /^(true|1|yes)$/i.test(get("votingEligible")),
        goodStanding: get("goodStanding") ? /^(true|1|yes)$/i.test(get("goodStanding")) : true,
        joinedAt: get("joinedAt") || null,
        expiresAt: get("expiresAt") || null,
      }
    })
    onImport(rows)
  }

  return (
    <ModalShell title="Import members" subtitle="Paste CSV with a header row" onClose={onClose}>
      <div className="space-y-4 px-5 py-5">
        <p className="text-sm text-muted-2">
          Required columns: <code className="rounded bg-surface px-1 text-heading">name</code>,{" "}
          <code className="rounded bg-surface px-1 text-heading">email</code>. Optional: organization, category, status,
          votingEligible, membershipId, joinedAt, expiresAt.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"name,email,organization,category\nAli Khan,ali@techverse.pk,TechVerse Pvt Ltd,Corporate"}
          className="w-full rounded-lg border border-line bg-white p-3 font-mono text-xs text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-heading hover:bg-surface">
            Cancel
          </button>
          <button
            type="button"
            onClick={parseAndImport}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-hover disabled:opacity-60"
          >
            <Upload className="size-4" /> Import
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      result.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-heading">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-2">{hint}</span>}
    </label>
  )
}

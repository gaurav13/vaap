"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Archive, ArchiveRestore, Check, Download, Trash2, X } from "lucide-react"
import {
  bulkApproveApplications,
  bulkArchiveApplications,
  bulkDeleteApplications,
  bulkRejectApplications,
  type BulkResult,
} from "@/app/actions/membership-bulk"

type Row = { id: number; reference: string | null; name: string; email: string; category: string; status: string; completed: boolean; paymentConfirmed: boolean; createdAt: string }

function toCsv(rows: Row[]) {
  const head = ["id", "reference", "name", "email", "category", "status", "submitted", "payment_verified", "created_at_utc"]
  const esc = (v: unknown) => {
    const s = String(v ?? "")
    // Neutralise spreadsheet formula injection.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
    return `"${safe.replace(/"/g, '""')}"`
  }
  return [head.join(","), ...rows.map((r) => [r.id, r.reference, r.name, r.email, r.category, r.status, r.completed, r.paymentConfirmed, r.createdAt].map(esc).join(","))].join("\n")
}

export function ApplicationsBulkBar({
  selected,
  role,
  showingArchived,
  onClear,
}: {
  selected: Row[]
  role: string
  showingArchived: boolean
  onClear: () => void
}) {
  const router = useRouter()
  const [busy, start] = useTransition()
  const [mode, setMode] = useState<null | "reject" | "delete">(null)
  const [reason, setReason] = useState("")
  const [sendEmail, setSendEmail] = useState(true)
  const [confirmText, setConfirmText] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const isSuper = role === "admin"
  const canManage = isSuper || role === "manager"
  const ids = selected.map((s) => s.id)

  function run(fn: () => Promise<BulkResult>, verb: string) {
    setMessage(null)
    start(async () => {
      try {
        const res = await fn()
        if (!res.ok) return setMessage(res.error)
        const skipped = res.skipped.length ? ` ${res.skipped.length} skipped: ${res.skipped.slice(0, 5).map((s) => `#${s.id} ${s.reason}`).join("; ")}${res.skipped.length > 5 ? "..." : ""}` : ""
        setMessage(`${res.done} ${verb}.${skipped}`)
        setMode(null)
        setReason("")
        setConfirmText("")
        onClear()
        router.refresh()
      } catch {
        setMessage("The bulk action failed. Nothing further was changed.")
      }
    })
  }

  function exportCsv() {
    const blob = new Blob([toCsv(selected)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (selected.length === 0 && !message) return null

  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-medium text-body hover:bg-mint disabled:opacity-50"

  return (
    <div className="sticky top-2 z-10 mt-4 rounded-xl border border-line bg-card p-3 shadow-sm" role="region" aria-label="Bulk actions">
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-heading">{selected.length} selected</span>
          <button type="button" className={btn} disabled={busy} onClick={() => window.confirm(`Approve ${selected.length} application(s)? Only submitted, payment-verified ones will be approved.`) && run(() => bulkApproveApplications(ids), "approved")}>
            <Check className="size-4" aria-hidden /> Approve
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => setMode(mode === "reject" ? null : "reject")}>
            <X className="size-4" aria-hidden /> Reject
          </button>
          {canManage && (
            <button type="button" className={btn} disabled={busy} onClick={() => run(() => bulkArchiveApplications(ids, !showingArchived), showingArchived ? "restored" : "archived")}>
              {showingArchived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
              {showingArchived ? "Unarchive" : "Archive"}
            </button>
          )}
          {canManage && (
            <button type="button" className={btn} disabled={busy} onClick={exportCsv}>
              <Download className="size-4" aria-hidden /> Export CSV
            </button>
          )}
          {isSuper && (
            <button type="button" className={`${btn} text-destructive`} disabled={busy} onClick={() => setMode(mode === "delete" ? null : "delete")}>
              <Trash2 className="size-4" aria-hidden /> Delete
            </button>
          )}
          <button type="button" className="ml-auto text-sm text-muted-2 underline" onClick={onClear}>
            Clear selection
          </button>
        </div>
      )}

      {mode === "reject" && (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => bulkRejectApplications(ids, reason, sendEmail), "rejected")
          }}
        >
          <label htmlFor="bulk-reason" className="text-sm font-medium text-heading">Rejection reason (required, stored on each record)</label>
          <textarea id="bulk-reason" required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="rounded-lg border border-line bg-background p-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Email the reason to applicants who submitted
          </label>
          <button type="submit" disabled={busy || reason.trim().length < 3} className="self-start rounded-lg bg-destructive px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            Reject {selected.length}
          </button>
        </form>
      )}

      {mode === "delete" && (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => bulkDeleteApplications(ids, confirmText), "deleted")
          }}
        >
          <p className="text-sm text-body">
            Soft-deletes {selected.length} application(s): they disappear from every list and count but stay in the audit log. Approved applications are skipped.
          </p>
          <label htmlFor="bulk-confirm" className="text-sm font-medium text-heading">Type DELETE to confirm</label>
          <input id="bulk-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" className="max-w-48 rounded-lg border border-line bg-background p-2 font-mono text-sm" />
          <button type="submit" disabled={busy || confirmText !== "DELETE"} className="self-start rounded-lg bg-destructive px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            Delete {selected.length}
          </button>
        </form>
      )}

      {message && (
        <p className="mt-2 text-sm text-body" role="status">
          {message}
        </p>
      )}
    </div>
  )
}

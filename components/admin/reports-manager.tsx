"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateReport } from "@/app/actions/reports"

type Report = {
  id: number
  reference: string
  name: string
  email: string
  phone: string | null
  category: string
  description: string
  status: string
  statusNote: string
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  review: "Under review",
  guidance: "Guidance provided",
  closed: "Closed",
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
})

export function ReportsManager({ items, initialRef }: { items: Report[]; initialRef: string | null }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<string>("open")
  const [selectedId, setSelectedId] = useState<number | null>(
    () => items.find((i) => i.reference === initialRef)?.id ?? items[0]?.id ?? null,
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      if (filter === "open" && i.status === "closed") return false
      if (filter !== "open" && filter !== "all" && i.status !== filter) return false
      if (!q) return true
      return [i.reference, i.name, i.email, i.category].some((v) => v.toLowerCase().includes(q))
    })
  }, [items, query, filter])

  const selected = items.find((i) => i.id === selectedId) ?? null

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-5">
      <section aria-label="Report list" className="lg:col-span-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
            <label htmlFor="report-search" className="sr-only">
              Search reports
            </label>
            <input
              id="report-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Reference, name, email"
              className="input-base w-full pl-9"
            />
          </div>
          <label htmlFor="report-filter" className="sr-only">
            Filter by status
          </label>
          <select id="report-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="input-base">
            <option value="open">Open</option>
            <option value="all">All</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <ul className="mt-3 divide-y divide-line-light overflow-hidden rounded-xl border border-line bg-card">
          {visible.length === 0 && <li className="p-5 text-sm text-muted-2">No reports match.</li>}
          {visible.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                aria-current={r.id === selectedId}
                className={cn(
                  "flex w-full flex-col gap-1 p-4 text-left transition-colors hover:bg-mint/50",
                  r.id === selectedId && "bg-mint",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-heading">{r.reference}</span>
                  <StatusPill status={r.status} />
                </span>
                <span className="text-sm font-semibold text-heading">{r.category}</span>
                <span className="text-xs text-muted-2">{dateFmt.format(new Date(r.createdAt))}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Report details" className="lg:col-span-3">
        {selected ? (
          <ReportDetail key={selected.id} report={selected} />
        ) : (
          <p className="rounded-xl border border-line bg-card p-6 text-sm text-muted-2">Select a report to view it.</p>
        )}
      </section>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold",
        status === "closed" ? "bg-line-light text-muted-2" : "bg-mint text-green",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function ReportDetail({ report }: { report: Report }) {
  const router = useRouter()
  const [status, setStatus] = useState(report.status)
  const [note, setNote] = useState(report.statusNote)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function save() {
    setMsg(null)
    start(async () => {
      const res = await updateReport({ id: report.id, status, statusNote: note })
      setMsg(res.ok ? { ok: true, text: "Report updated." } : { ok: false, text: res.error })
      if (res.ok) router.refresh()
    })
  }

  return (
    <article className="rounded-xl border border-line bg-card p-5 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-semibold text-muted-2">{report.reference}</p>
          <h2 className="mt-1 text-lg font-bold text-heading">{report.category}</h2>
          <p className="text-xs text-muted-2">Submitted {dateFmt.format(new Date(report.createdAt))}</p>
        </div>
        <StatusPill status={report.status} />
      </header>

      <dl className="mt-5 grid gap-3 rounded-lg border border-line-light p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">Reporter</dt>
          <dd className="mt-0.5 text-heading">{report.name}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">Email</dt>
          <dd className="mt-0.5 truncate">
            <a href={`mailto:${report.email}`} className="text-green underline-offset-2 hover:underline">
              {report.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">Phone</dt>
          <dd className="mt-0.5 text-heading">{report.phone || "—"}</dd>
        </div>
      </dl>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-2">Description</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-heading">{report.description}</p>

      <div className="mt-6 flex flex-col gap-3 border-t border-line-light pt-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="report-status" className="text-sm font-semibold text-heading">
            Status
          </label>
          <select id="report-status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-base max-w-xs">
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="report-note" className="text-sm font-semibold text-heading">
            Note shown to the reporter
          </label>
          <textarea
            id="report-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-base w-full"
            placeholder="Visible when the reporter tracks this case with their reference."
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Save
          </button>
          {msg && (
            <p role="status" className={cn("text-sm", msg.ok ? "text-green" : "text-destructive")}>
              {msg.text}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

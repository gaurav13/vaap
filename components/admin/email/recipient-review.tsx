"use client"

import { useMemo, useState, useTransition } from "react"
import { Users } from "lucide-react"
import { listAudienceRecipients } from "@/app/actions/newsletters"
import type { AudienceReport } from "@/lib/newsletter/audience"
import { groupLabel, type AudienceSelection } from "@/lib/newsletter/content"
import { Btn, inputCls } from "./shared"

type Row = { email: string; name: string; status: string }

function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className={strong ? "text-sm font-semibold text-heading" : "text-sm text-body"}>{label}</dt>
      <dd className={strong ? "font-serif text-2xl font-bold text-green" : "text-sm font-semibold tabular-nums text-heading"}>{value.toLocaleString()}</dd>
    </div>
  )
}

export function RecipientReview({
  report,
  loading,
  error,
  audience,
  isMarketing,
  canViewList,
  onRefresh,
}: {
  report: AudienceReport | null
  loading: boolean
  error: string
  audience: AudienceSelection
  isMarketing: boolean
  canViewList: boolean
  onRefresh: () => void
}) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [filter, setFilter] = useState("")
  const [listError, setListError] = useState("")
  const [listing, startList] = useTransition()

  const visible = useMemo(() => {
    if (!rows) return []
    const q = filter.trim().toLowerCase()
    return q ? rows.filter((r) => r.email.includes(q) || r.name.toLowerCase().includes(q) || r.status.toLowerCase().includes(q)) : rows
  }, [rows, filter])

  if (loading && !report) return <p className="text-sm text-muted-2" role="status">Counting recipients…</p>
  if (error) return <p className="text-sm text-destructive" role="alert">{error}</p>
  if (!report) return <Btn onClick={onRefresh}>Count recipients</Btn>

  const ex = report.excluded
  const valid = report.final + (report.excludedTotal - ex.invalid)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-heading">Selected categories</h3>
        {report.groupCounts.length === 0 && report.manualAdded === 0 ? (
          <p className="text-sm text-destructive">No categories selected. Go back and choose who should receive this email.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {report.groupCounts.map((g) => (
              <li key={g.group} className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-green">
                {groupLabel(g.group)} · {g.count.toLocaleString()}
              </li>
            ))}
            {report.manualAdded > 0 && (
              <li className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-green">Added manually · {report.manualAdded}</li>
            )}
          </ul>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <dl className="flex flex-col divide-y divide-line rounded-xl border border-line px-4">
          <Stat label="Total matching contacts" value={report.matching + report.manualAdded} />
          <Stat label="Duplicates removed" value={report.duplicates} />
          <Stat label="Valid email addresses" value={valid} />
          <Stat label="Excluded contacts" value={report.excludedTotal} />
          <Stat label="Final recipients" value={report.final} strong />
        </dl>
        <div className="flex flex-col gap-2 rounded-xl border border-line p-4">
          <h3 className="text-sm font-semibold text-heading">Why contacts were excluded</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-body">
            <li>Invalid email address: {ex.invalid}</li>
            {isMarketing && <li>Unsubscribed from newsletters: {ex.unsubscribed}</li>}
            <li>Bounced (undeliverable): {ex.bounced}</li>
            {isMarketing && <li>No marketing consent: {ex.noConsent}</li>}
            <li>Excluded by you: {ex.manual}</li>
          </ul>
          <p className="mt-auto pt-2 text-xs leading-relaxed text-muted-2">
            {isMarketing
              ? "Marketing emails skip anyone who unsubscribed or has not consented."
              : "Service emails reach everyone selected except hard bounces and addresses you excluded."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Btn variant="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? "Recounting…" : "Recount"}
        </Btn>
        {canViewList ? (
          <Btn
            variant="secondary"
            disabled={listing || report.final === 0}
            onClick={() =>
              startList(async () => {
                const res = await listAudienceRecipients(audience, isMarketing)
                if (res.ok) {
                  setRows(res.recipients)
                  setTruncated(res.truncated)
                  setListError("")
                } else setListError(res.error)
              })
            }
          >
            <Users className="size-4" aria-hidden="true" />
            {listing ? "Loading…" : "Preview recipient list"}
          </Btn>
        ) : (
          <p className="text-xs text-muted-2">Only Admins can view recipient names and email addresses.</p>
        )}
      </div>
      {listError && <p className="text-sm text-destructive">{listError}</p>}

      {rows && (
        <div className="flex flex-col gap-3">
          <input className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name, email or status" aria-label="Filter recipients" />
          <div className="max-h-96 overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface text-xs uppercase tracking-wide text-muted-2">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => (
                  <tr key={r.email}>
                    <td className="px-3 py-2 text-heading">{r.name || "—"}</td>
                    <td className="px-3 py-2 text-body">{r.email}</td>
                    <td className="px-3 py-2 text-muted-2">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-2">
            Showing {visible.length.toLocaleString()} of {rows.length.toLocaleString()}
            {truncated ? " (first 5,000 only)" : ""}.
          </p>
        </div>
      )}
    </div>
  )
}

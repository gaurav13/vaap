"use client"

import { Fragment, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { getCampaignRecipients, retryFailedRecipients, duplicateCampaign } from "@/app/actions/newsletters"
import type { HistoryRow } from "@/lib/newsletter/admin-data"
import { cn } from "@/lib/utils"
import { Btn, fmtDate, inputCls, Notice, type Msg } from "./shared"

type RecipientRow = { email: string; name: string; segment: string; status: string; sentAt: string | null }

const STATUS_STYLE: Record<string, string> = {
  sending: "bg-amber-100 text-amber-800",
  sent: "bg-mint text-green",
  cancelled: "bg-surface text-muted-2",
}

function RecipientsTable({ id }: { id: number }) {
  const [rows, setRows] = useState<RecipientRow[] | null>(null)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("")
  const [pending, start] = useTransition()

  const visible = useMemo(() => {
    if (!rows) return []
    const q = filter.trim().toLowerCase()
    return q ? rows.filter((r) => r.email.includes(q) || r.name.toLowerCase().includes(q) || r.status.includes(q)) : rows
  }, [rows, filter])

  if (!rows)
    return (
      <div className="flex flex-col gap-2">
        <Btn
          variant="secondary"
          className="h-9 w-fit"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await getCampaignRecipients(id)
              if (res.ok) setRows(res.rows)
              else setError(res.error)
            })
          }
        >
          {pending ? "Loading…" : "View recipients"}
        </Btn>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )

  return (
    <div className="flex flex-col gap-2">
      <input className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name, email or status" aria-label="Filter recipients" />
      <div className="max-h-80 overflow-auto rounded-lg border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface text-xs uppercase tracking-wide text-muted-2">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Group</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((r) => (
              <tr key={r.email}>
                <td className="px-3 py-2 text-heading">{r.name || "—"}</td>
                <td className="px-3 py-2 text-body">{r.email}</td>
                <td className="px-3 py-2 text-muted-2">{r.segment || "—"}</td>
                <td className="px-3 py-2 capitalize text-body">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-2">
        Showing {visible.length.toLocaleString()} of {rows.length.toLocaleString()}.
      </p>
    </div>
  )
}

export function EmailHistory({ rows, canSend, showKind, onDuplicated }: { rows: HistoryRow[]; canSend: boolean; showKind?: boolean; onDuplicated?: (id: number) => void }) {
  const router = useRouter()
  const [open, setOpen] = useState<number | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()

  if (!rows.length) return <p className="rounded-xl border border-line bg-card p-6 text-sm text-muted-2">Nothing has been sent yet.</p>

  return (
    <div className="flex flex-col gap-3">
      <Notice msg={msg} />
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted-2">
            <tr>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Audience</th>
              <th className="px-4 py-3 font-semibold">Sent</th>
              <th className="px-4 py-3 text-right font-semibold">Recipients</th>
              <th className="px-4 py-3 text-right font-semibold">Delivered</th>
              <th className="px-4 py-3 text-right font-semibold">Failed</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-b border-line-light align-top last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-heading">{r.title}</p>
                    <p className="text-xs text-muted-2">
                      {showKind ? `${r.kind === "newsletter" ? "Newsletter" : "Custom email"} · ` : ""}
                      {r.isMarketing ? "Marketing" : "Service notice"}
                    </p>
                  </td>
                  <td className="max-w-56 px-4 py-3 text-body">{r.audienceLabel}</td>
                  <td className="px-4 py-3 text-body">
                    <p>{fmtDate(r.sentAt)}</p>
                    {r.sentByName && <p className="text-xs text-muted-2">by {r.sentByName}</p>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-heading">{r.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-heading">{r.sent.toLocaleString()}</td>
                  <td className={cn("px-4 py-3 text-right tabular-nums", r.failed + r.bounced ? "text-destructive" : "text-heading")}>{(r.failed + r.bounced).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", STATUS_STYLE[r.status] ?? "bg-surface text-body")}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Btn variant="ghost" className="h-8 px-3" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>
                      {open === r.id ? "Hide" : "Details"}
                    </Btn>
                  </td>
                </tr>
                {open === r.id && (
                  <tr className="border-b border-line-light bg-surface/50">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="flex flex-col gap-4">
                        <p className="text-sm text-body">
                          Subject: <span className="font-semibold text-heading">{r.subject}</span>
                        </p>
                        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                          {(
                            [
                              ["Queued", r.queued],
                              ["Delivered", r.sent],
                              ["Failed", r.failed],
                              ["Bounced", r.bounced],
                              ["Opened", r.opened],
                              ["Unsubscribed", r.unsubscribed],
                            ] as const
                          ).map(([k, v]) => (
                            <div key={k} className="rounded-lg border border-line bg-card px-3 py-2">
                              <dt className="text-xs text-muted-2">{k}</dt>
                              <dd className="text-lg font-semibold tabular-nums text-heading">{v.toLocaleString()}</dd>
                            </div>
                          ))}
                        </dl>
                        {canSend && (
                          <div className="flex flex-wrap gap-2">
                            {r.failed > 0 && (
                              <Btn
                                variant="secondary"
                                className="h-9"
                                disabled={pending}
                                onClick={() =>
                                  start(async () => {
                                    const res = await retryFailedRecipients(r.id)
                                    setMsg(res.ok ? { tone: "ok", text: `${res.count} failed recipients queued again.` } : { tone: "error", text: res.error })
                                    router.refresh()
                                  })
                                }
                              >
                                Retry failed
                              </Btn>
                            )}
                            <Btn
                              variant="secondary"
                              className="h-9"
                              disabled={pending}
                              onClick={() =>
                                start(async () => {
                                  const res = await duplicateCampaign(r.id)
                                  if (!res.ok) return setMsg({ tone: "error", text: res.error })
                                  setMsg({ tone: "ok", text: "Copied to a new draft." })
                                  onDuplicated?.(res.id)
                                  router.refresh()
                                })
                              }
                            >
                              Duplicate as draft
                            </Btn>
                          </div>
                        )}
                        {canSend ? <RecipientsTable id={r.id} /> : <p className="text-xs text-muted-2">Only Admins can view the recipient list.</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

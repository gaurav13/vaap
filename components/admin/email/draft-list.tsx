"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Pencil, Trash2 } from "lucide-react"
import { cancelCampaign, deleteCampaign, duplicateCampaign } from "@/app/actions/newsletters"
import { deleteEmailTemplate, duplicateEmailTemplate } from "@/app/actions/custom-email-templates"
import type { EditableRow } from "@/lib/newsletter/admin-data"
import { cn } from "@/lib/utils"
import { Btn, fmtDate, Notice, type Msg } from "./shared"

type R = { ok: true } | { ok: false; error: string }

export function DraftList({
  rows,
  kind,
  canSend,
  onEdit,
  empty,
}: {
  rows: EditableRow[]
  kind: "campaign" | "template"
  canSend: boolean
  onEdit: (row: EditableRow) => void
  empty: string
}) {
  const router = useRouter()
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()

  const run = (fn: () => Promise<R>, ok: string) =>
    start(async () => {
      const res = await fn()
      setMsg(res.ok ? { tone: "ok", text: ok } : { tone: "error", text: res.error })
      router.refresh()
    })

  if (!rows.length) return <p className="rounded-xl border border-line bg-card p-6 text-sm text-muted-2">{empty}</p>

  return (
    <div className="flex flex-col gap-3">
      <Notice msg={msg} />
      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-card">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-heading">{kind === "template" ? r.name : r.content.title || "Untitled"}</p>
                {kind === "campaign" && (
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", r.status === "scheduled" ? "bg-amber-100 text-amber-800" : "bg-surface text-body")}>
                    {r.status === "scheduled" ? `Scheduled ${fmtDate(r.scheduledAt)}` : "Draft"}
                  </span>
                )}
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted-2">{r.isMarketing ? "Marketing" : "Service notice"}</span>
              </div>
              <p className="truncate text-xs text-muted-2">
                {kind === "template" && r.content.subject ? `${r.content.subject} · ` : ""}
                {r.audienceLabel} · Updated {fmtDate(r.updatedAt)}
                {r.updatedByName ? ` by ${r.updatedByName}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Btn variant="secondary" className="h-9 px-3" onClick={() => onEdit(r)}>
                <Pencil className="size-3.5" aria-hidden="true" />
                {kind === "template" ? "Edit / use" : "Edit"}
              </Btn>
              <Btn
                variant="secondary"
                className="h-9 px-3"
                disabled={pending}
                onClick={() => run(() => (kind === "template" ? duplicateEmailTemplate(r.id!) : duplicateCampaign(r.id!)), "Duplicated.")}
              >
                <Copy className="size-3.5" aria-hidden="true" />
                Duplicate
              </Btn>
              {kind === "campaign" && r.status === "scheduled" && canSend && (
                <Btn variant="secondary" className="h-9 px-3" disabled={pending} onClick={() => run(() => cancelCampaign(r.id!), "Schedule cancelled. It is a draft again.")}>
                  Cancel schedule
                </Btn>
              )}
              <Btn
                variant="danger"
                className="h-9 px-3"
                disabled={pending}
                aria-label={`Delete ${kind === "template" ? r.name : r.content.title}`}
                onClick={() => {
                  if (!window.confirm(kind === "template" ? "Delete this template?" : "Delete this draft?")) return
                  run(() => (kind === "template" ? deleteEmailTemplate(r.id!) : deleteCampaign(r.id!)), "Deleted.")
                }}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Btn>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

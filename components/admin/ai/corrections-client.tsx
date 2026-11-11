"use client"

import { useActionState, useState, useTransition } from "react"
import {
  createCorrection,
  getCorrectionHistory,
  restoreCorrectionVersion,
  reviewCorrection,
  submitCorrection,
  updateCorrection,
  type ActionResult,
} from "@/app/actions/ai-admin"
import { TOPICS } from "@/lib/ai-assistant/config"
import { dateTime } from "@/lib/ai-assistant/format"
import { MarkdownRichEditor } from "@/components/admin/markdown-rich-editor"
import { MarkdownView } from "@/components/markdown-view"
import { richTextToPlain } from "@/lib/rich-text-plain"
import { StatusBadge } from "@/components/admin/ai/ui"
import { cn } from "@/lib/utils"

const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed text-heading"
const btn = "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-50"
const primary = cn(btn, "bg-green text-primary-foreground hover:bg-green-hover")
const secondary = cn(btn, "border border-border text-heading hover:bg-muted")
const danger = cn(btn, "border border-destructive/30 text-destructive hover:bg-destructive/10")

function Result({ state }: { state: ActionResult | null }) {
  if (!state) return null
  return (
    <p role="status" className={cn("text-sm", state.ok ? "text-green" : "text-destructive")}>
      {state.ok ? state.message : state.error}
    </p>
  )
}

export function CorrectionForm({
  prefill,
  isSuperAdmin,
}: {
  prefill: { id: number; question: string; answer: string; topic: string } | null
  isSuperAdmin: boolean
}) {
  const [state, action, pending] = useActionState(createCorrection, null)
  return (
    <form action={action} className="flex flex-col gap-4">
      {prefill ? <input type="hidden" name="usageLogId" value={prefill.id} /> : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-question" className="text-sm font-medium text-heading">
          Question
        </label>
        <input id="c-question" name="question" required defaultValue={prefill?.question ?? ""} className={field} />
      </div>
      {prefill?.answer ? (
        <div className="rounded-lg bg-muted p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-2">Original answer</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-heading">{prefill.answer}</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-answer" className="text-sm font-medium text-heading">
          Corrected answer
        </label>
        <MarkdownRichEditor id="c-answer" name="correctedAnswer" required minLength={10} maxLength={6000} label="Corrected answer" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="c-keywords" className="text-sm font-medium text-heading">
            Keywords <span className="font-normal text-muted-2">(optional, comma separated)</span>
          </label>
          <input id="c-keywords" name="keywords" className={field} placeholder="membership fee, renewal" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="c-topic" className="text-sm font-medium text-heading">
            Topic
          </label>
          <select id="c-topic" name="topic" defaultValue={prefill?.topic || "general"} className={field}>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {isSuperAdmin ? (
          <button type="submit" name="intent" value="approve" disabled={pending} className={primary}>
            Save and approve
          </button>
        ) : (
          <button type="submit" name="intent" value="submit" disabled={pending} className={primary}>
            Submit for approval
          </button>
        )}
        <button type="submit" name="intent" value="draft" disabled={pending} className={secondary}>
          Save draft
        </button>
        <Result state={state} />
      </div>
    </form>
  )
}

type Correction = {
  id: number
  question: string
  originalAnswer: string
  correctedAnswer: string
  keywords: string
  topic: string
  status: string
  version: number
  createdByName: string
  reviewNote: string
  updatedAt: string
}

type Version = Awaited<ReturnType<typeof getCorrectionHistory>>[number]

export function CorrectionCard({ correction: c, isSuperAdmin }: { correction: Correction; isSuperAdmin: boolean }) {
  const [editing, setEditing] = useState(false)
  const [history, setHistory] = useState<Version[] | null>(null)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, start] = useTransition()

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn()
      setResult(r)
      if (r.ok) {
        setEditing(false)
        setHistory(null)
      }
    })

  const toggleHistory = () =>
    start(async () => {
      setHistory(history ? null : await getCorrectionHistory(c.id))
    })

  const editable = isSuperAdmin || c.status === "draft" || c.status === "pending"

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-pretty font-medium text-heading">{c.question}</h3>
        <div className="flex items-center gap-2">
          <StatusBadge status={c.status} label={c.status === "approved" ? "Live" : undefined} />
          <span className="text-xs text-muted-2">v{c.version}</span>
        </div>
      </header>

      {editing ? (
        <form
          className="flex flex-col gap-3"
          action={(fd) =>
            run(() =>
              updateCorrection(c.id, {
                correctedAnswer: String(fd.get("correctedAnswer") ?? ""),
                keywords: String(fd.get("keywords") ?? ""),
                topic: String(fd.get("topic") ?? "general"),
                note: String(fd.get("note") ?? ""),
              }),
            )
          }
        >
          <label className="sr-only" htmlFor={`a-${c.id}`}>
            Corrected answer
          </label>
          <MarkdownRichEditor
            id={`a-${c.id}`}
            name="correctedAnswer"
            required
            minLength={10}
            maxLength={6000}
            defaultValue={c.correctedAnswer}
            label="Corrected answer"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="keywords" aria-label="Keywords" defaultValue={c.keywords} className={field} placeholder="Keywords" />
            <select name="topic" aria-label="Topic" defaultValue={c.topic} className={field}>
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input name="note" aria-label="Change note" className={field} placeholder="What changed?" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={primary}>
              Save new version
            </button>
            <button type="button" onClick={() => setEditing(false)} className={secondary}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <MarkdownView text={c.correctedAnswer} className="text-heading" />
      )}

      {c.originalAnswer ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-2">Original answer</summary>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed text-muted-2">{c.originalAnswer}</p>
        </details>
      ) : null}

      <p className="text-xs text-muted-2">
        {c.topic}
        {c.keywords ? ` · ${c.keywords}` : ""} · by {c.createdByName || "unknown"} · updated {dateTime(c.updatedAt)}
        {c.reviewNote ? ` · Note: ${c.reviewNote}` : ""}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {editable && !editing ? (
          <button type="button" onClick={() => setEditing(true)} className={secondary}>
            Edit
          </button>
        ) : null}
        {c.status === "draft" ? (
          <button type="button" disabled={pending} onClick={() => run(() => submitCorrection(c.id))} className={secondary}>
            Submit for approval
          </button>
        ) : null}
        {isSuperAdmin && c.status !== "approved" ? (
          <button type="button" disabled={pending} onClick={() => run(() => reviewCorrection(c.id, "approve"))} className={primary}>
            Approve
          </button>
        ) : null}
        {isSuperAdmin && c.status === "pending" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const note = window.prompt("Reason for rejecting (shown to the author):") ?? ""
              run(() => reviewCorrection(c.id, "reject", note))
            }}
            className={danger}
          >
            Reject
          </button>
        ) : null}
        {isSuperAdmin && c.status === "approved" ? (
          <button type="button" disabled={pending} onClick={() => run(() => reviewCorrection(c.id, "withdraw"))} className={danger}>
            Withdraw
          </button>
        ) : null}
        <button type="button" disabled={pending} onClick={toggleHistory} aria-expanded={history != null} className={secondary}>
          {history ? "Hide history" : "History"}
        </button>
        <Result state={result} />
      </div>

      {history ? (
        <ol className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {history.map((v) => (
            <li key={v.id} className="flex flex-col gap-1.5 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-heading">
                  v{v.version} · {v.action}
                </span>
                <span className="text-xs text-muted-2">
                  {v.changedByName} · {dateTime(new Date(v.createdAt).toISOString())}
                </span>
              </div>
              {v.note ? <p className="text-xs text-muted-2">{v.note}</p> : null}
              <p className="line-clamp-3 text-muted-2">{richTextToPlain(v.correctedAnswer)}</p>
              {isSuperAdmin && v.correctedAnswer !== c.correctedAnswer ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => restoreCorrectionVersion(c.id, v.id))}
                  className="self-start text-xs font-medium text-green hover:underline"
                >
                  Restore this version
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  )
}

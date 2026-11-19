"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { saveLeadershipTypeLabels } from "@/app/actions/settings"
import { LEADERSHIP_TYPES, TYPE_LABEL_MAX, type LeadershipTypeLabels } from "@/lib/leadership"

const input =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-heading placeholder:text-muted-2 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"

export function LeadershipTypeNames({ labels }: { labels: LeadershipTypeLabels }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(LEADERSHIP_TYPES.map((t) => [t.value, labels[t.value] ?? t.label])),
  )
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus(null)
    startTransition(async () => {
      try {
        await saveLeadershipTypeLabels(values)
        setStatus({ ok: true, text: "Type names saved. The website now shows the new names." })
        router.refresh()
      } catch {
        setStatus({ ok: false, text: "Could not save the type names. Please try again." })
      }
    })
  }

  return (
    <details className="rounded-xl border border-line bg-card">
      <summary className="cursor-pointer select-none px-5 py-4 text-sm font-semibold text-heading">
        Leadership Type names
        <span className="ml-2 font-normal text-muted-2">Rename the Types shown in admin and on the website</span>
      </summary>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 border-t border-line px-5 py-5">
        <p className="text-sm leading-relaxed text-muted-2">
          Renaming only changes the name people see. Every profile and application keeps its Type, so nothing moves
          or needs to be re-saved. Leave a field empty to use the original name.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {LEADERSHIP_TYPES.map((t) => {
            const id = `type-${t.value.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`
            return (
              <div key={t.value} className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-sm font-medium text-heading">
                  {t.label}
                </label>
                <input
                  id={id}
                  value={values[t.value] ?? ""}
                  maxLength={TYPE_LABEL_MAX}
                  placeholder={t.label}
                  onChange={(e) => setValues((v) => ({ ...v, [t.value]: e.target.value }))}
                  className={input}
                />
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-green-hover disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Save type names
          </button>
          {status ? (
            <p role="status" className={`text-sm ${status.ok ? "text-green" : "text-destructive"}`}>
              {status.text}
            </p>
          ) : null}
        </div>
      </form>
    </details>
  )
}

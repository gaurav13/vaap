"use client"

import { useState, type FormEvent } from "react"
import { Search, ArrowRight, Loader2, FileText, Clock } from "lucide-react"
import { trackComplaint, type TrackResult } from "@/app/actions/support"

const STEPS: { key: string; label: string }[] = [
  { key: "submitted", label: "Submitted" },
  { key: "review", label: "Review" },
  { key: "guidance", label: "Guidance" },
  { key: "closed", label: "Closed" },
]

export function TrackCase() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TrackResult | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setPending(true)
    try {
      const res = await trackComplaint(new FormData(e.currentTarget))
      if (res.ok) {
        setResult(res.result)
      } else {
        setError(res.error)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setPending(false)
    }
  }

  const activeIndex = result ? STEPS.findIndex((s) => s.key === result.status) : -1

  return (
    <div id="track" className="scroll-mt-24 rounded-xl border border-line bg-card p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mint text-green">
          <Search className="size-5" />
        </span>
        <div>
          <h3 className="font-serif text-xl text-heading">Track Your Case</h3>
          <p className="mt-0.5 text-sm text-body">Enter your case reference number to check the latest status.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          name="reference"
          required
          placeholder="e.g. VAAP-CASE-000123"
          className="input-base flex-1"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Track Case
          {!pending ? <ArrowRight className="size-4" /> : null}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive">{error}</p>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-lg border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-heading">
              <FileText className="size-4 text-green" />
              {result.reference}
            </p>
            <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-green">
              {result.statusLabel}
            </span>
          </div>

          <div className="mt-4 flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                      i <= activeIndex ? "bg-green text-white" : "bg-line-light text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`mt-1 text-[11px] ${i <= activeIndex ? "font-medium text-heading" : "text-muted-foreground"}`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 ? (
                  <div className={`mx-1 h-0.5 flex-1 ${i < activeIndex ? "bg-green" : "bg-line-light"}`} />
                ) : null}
              </div>
            ))}
          </div>

          {result.statusNote ? (
            <p className="mt-4 rounded-md bg-card px-3 py-2 text-sm text-body">{result.statusNote}</p>
          ) : null}

          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            Submitted {result.submittedAt} · Updated {result.updatedAt}
          </p>
        </div>
      ) : null}
    </div>
  )
}

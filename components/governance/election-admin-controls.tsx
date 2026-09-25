"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setElectionStatusAction, recomputeElectionAction } from "@/app/actions/elections"

const FLOW: Record<string, { next: string; label: string }[]> = {
  draft: [{ next: "active", label: "Open voting" }],
  published: [{ next: "active", label: "Open voting" }],
  active: [{ next: "closed", label: "Close voting" }],
  closed: [{ next: "results_published", label: "Publish results" }],
  results_published: [{ next: "archived", label: "Archive" }],
}

export function ElectionAdminControls({ id, status }: { id: number; status: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const actions = FLOW[status] ?? []

  function run(next: string) {
    setError("")
    startTransition(async () => {
      const res = await setElectionStatusAction(id, next)
      if (res.ok) router.refresh()
      else setError(res.error ?? "Could not update.")
    })
  }

  function recompute() {
    startTransition(async () => {
      await recomputeElectionAction(id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <button
          key={a.next}
          onClick={() => run(a.next)}
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Working…" : a.label}
        </button>
      ))}
      {(status === "closed" || status === "results_published") && (
        <button
          onClick={recompute}
          disabled={pending}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-heading transition hover:bg-muted disabled:opacity-60"
        >
          Recompute tally
        </button>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  )
}

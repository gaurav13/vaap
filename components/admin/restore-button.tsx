"use client"

import { useState, useTransition } from "react"
import { RotateCcw } from "lucide-react"
import { restoreRevision } from "@/app/actions/activity"

export function RestoreButton({ revisionId }: { revisionId: number }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onRestore() {
    if (!confirm("Restore this version? The current content will be saved as a new version first.")) return
    setError(null)
    startTransition(async () => {
      const res = await restoreRevision(revisionId)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onRestore}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-heading transition-colors hover:bg-muted disabled:opacity-50"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        {pending ? "Restoring..." : "Restore"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}

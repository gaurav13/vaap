"use client"

import { useId, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, AlertTriangle } from "lucide-react"
import { deleteProposalAction } from "@/app/actions/governance"

export function DeleteProposalButton({
  id,
  reference: referenceProp,
  title,
  voteCount = 0,
  variant = "full",
  redirectTo,
}: {
  id: number
  reference: string | null
  title: string
  voteCount?: number
  variant?: "full" | "compact"
  redirectTo?: string
}) {
  const reference = referenceProp || `DELETE-${id}`
  const router = useRouter()
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const matches = confirmText.trim() === reference

  function close() {
    if (pending) return
    setOpen(false)
    setConfirmText("")
    setError("")
  }

  function onDelete() {
    if (!matches) return
    setError("")
    startTransition(async () => {
      const res = await deleteProposalAction(id)
      if (!res.ok) {
        setError(res.error ?? "Could not delete the proposal.")
        return
      }
      setOpen(false)
      if (redirectTo) router.push(redirectTo)
      router.refresh()
    })
  }

  return (
    <>
      {variant === "compact" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-background px-3 py-1.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          aria-label={`Delete proposal ${reference}`}
        >
          <Trash2 className="size-3.5" /> Delete
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <div>
            <h2 className="text-sm font-bold text-heading">Delete this proposal</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-2">
              Permanently removes the proposal, its options, votes, results, documents, and discussion. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Trash2 className="size-4" /> Delete proposal
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          role="presentation"
          onClick={close}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${inputId}-title`}
            aria-describedby={`${inputId}-desc`}
            className="w-full max-w-md rounded-2xl border border-line bg-card p-6 text-left shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && close()}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 id={`${inputId}-title`} className="text-lg font-bold text-heading">
                  Delete proposal?
                </h2>
                <p id={`${inputId}-desc`} className="mt-1 text-sm leading-relaxed text-muted-2">
                  <span className="font-semibold text-heading">{title}</span> will be permanently deleted
                  {voteCount > 0 ? `, including ${voteCount} cast vote${voteCount === 1 ? "" : "s"}` : ""}. Any
                  records already anchored on the XRP Ledger stay on-chain.
                </p>
              </div>
            </div>

            <label htmlFor={inputId} className="mt-5 block text-sm font-medium text-heading">
              Type <span className="font-mono font-semibold">{reference}</span> to confirm
            </label>
            <input
              id={inputId}
              autoFocus
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) onDelete()
              }}
              className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2.5 font-mono text-sm text-heading outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/20"
            />

            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded-lg border border-line bg-background px-4 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-card disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={!matches || pending}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Trash2 className="size-4" /> {pending ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

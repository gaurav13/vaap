"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, UserRound } from "lucide-react"
import { addCandidateAction, removeCandidateAction } from "@/app/actions/elections"

type Candidate = { id: number; positionId: number; name: string; organization: string; manifesto: string }
type Position = { id: number; title: string; seats: number }

export function CandidateManager({
  electionId,
  positions,
  candidates,
  editable,
}: {
  electionId: number
  positions: Position[]
  candidates: Candidate[]
  editable: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [openFor, setOpenFor] = useState<number | null>(null)
  const [error, setError] = useState("")

  function submit(formData: FormData) {
    setError("")
    startTransition(async () => {
      const res = await addCandidateAction(formData)
      if (res.ok) {
        setOpenFor(null)
        router.refresh()
      } else setError(res.error ?? "Could not add candidate.")
    })
  }

  function remove(candidateId: number) {
    startTransition(async () => {
      await removeCandidateAction(candidateId, electionId)
      router.refresh()
    })
  }

  const input =
    "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"

  return (
    <div className="space-y-6">
      {positions.map((pos) => {
        const posCandidates = candidates.filter((c) => c.positionId === pos.id)
        return (
          <div key={pos.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg text-heading">{pos.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {pos.seats} {pos.seats === 1 ? "seat" : "seats"} · {posCandidates.length} candidates
                </p>
              </div>
              {editable && (
                <button
                  onClick={() => setOpenFor(openFor === pos.id ? null : pos.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-heading transition hover:bg-muted"
                >
                  <Plus className="size-3.5" />
                  Add candidate
                </button>
              )}
            </div>

            {posCandidates.length > 0 && (
              <ul className="mt-4 divide-y divide-border">
                {posCandidates.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <UserRound className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-heading">{c.name}</p>
                        {c.organization && <p className="text-xs text-muted-foreground">{c.organization}</p>}
                        {c.manifesto && <p className="mt-1 text-xs text-muted-foreground">{c.manifesto}</p>}
                      </div>
                    </div>
                    {editable && (
                      <button
                        onClick={() => remove(c.id)}
                        disabled={pending}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:text-destructive"
                        aria-label={`Remove ${c.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {editable && openFor === pos.id && (
              <form action={submit} className="mt-4 space-y-3 rounded-lg border border-dashed border-border p-4">
                <input type="hidden" name="electionId" value={electionId} />
                <input type="hidden" name="positionId" value={pos.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Candidate name</label>
                    <input name="name" required className={input} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Organization</label>
                    <input name="organization" className={input} placeholder="Company / affiliation" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Manifesto</label>
                  <textarea name="manifesto" rows={2} className={input} placeholder="Short statement" />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    {pending ? "Saving…" : "Save candidate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenFor(null)}
                    className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-heading transition hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )
      })}
    </div>
  )
}

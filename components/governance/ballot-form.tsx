"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ShieldCheck, UserRound } from "lucide-react"
import { castBallotAction } from "@/app/actions/elections"

type Candidate = { id: number; positionId: number; name: string; organization: string; manifesto: string }
type Position = { id: number; title: string; description: string; seats: number }

export function BallotForm({
  electionId,
  positions,
  candidates,
  alreadyVoted,
  existingToken,
}: {
  electionId: number
  positions: Position[]
  candidates: Candidate[]
  alreadyVoted: boolean
  existingToken: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [selections, setSelections] = useState<Record<number, number[]>>({})
  const [receipt, setReceipt] = useState<string | null>(alreadyVoted ? existingToken : null)
  const [done, setDone] = useState(alreadyVoted)

  function toggle(position: Position, candidateId: number) {
    setSelections((prev) => {
      const current = prev[position.id] ?? []
      if (current.includes(candidateId)) {
        return { ...prev, [position.id]: current.filter((id) => id !== candidateId) }
      }
      if (current.length >= position.seats) {
        // Single-seat: replace. Multi-seat: ignore once full.
        if (position.seats === 1) return { ...prev, [position.id]: [candidateId] }
        return prev
      }
      return { ...prev, [position.id]: [...current, candidateId] }
    })
  }

  function submit() {
    setError("")
    startTransition(async () => {
      const res = await castBallotAction({ electionId, selections })
      if (res.ok) {
        setReceipt(res.ballotToken ?? null)
        setDone(true)
        router.refresh()
      } else {
        setError(res.error ?? "Could not submit your ballot.")
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <h2 className="mt-3 font-serif text-xl text-heading">Your ballot is recorded</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your vote is secret. Keep this ballot token to verify your participation later.
        </p>
        {receipt && (
          <p className="mt-4 inline-block break-all rounded-lg bg-background px-4 py-2 font-mono text-sm text-heading">
            {receipt}
          </p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          You may change your vote while the election is open — your latest ballot is the one that counts.
        </p>
        <button
          onClick={() => {
            setDone(false)
          }}
          className="mt-4 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-heading transition hover:bg-muted"
        >
          Change my vote
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {positions.map((pos) => {
        const posCandidates = candidates.filter((c) => c.positionId === pos.id)
        const chosen = selections[pos.id] ?? []
        return (
          <div key={pos.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-serif text-lg text-heading">{pos.title}</h3>
              <span className="text-xs text-muted-foreground">
                Choose up to {pos.seats} · {chosen.length} selected
              </span>
            </div>
            {pos.description && <p className="mt-1 text-sm text-muted-foreground">{pos.description}</p>}
            <ul className="mt-4 space-y-2">
              {posCandidates.map((c) => {
                const active = chosen.includes(c.id)
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => toggle(pos, c.id)}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {active ? <CheckCircle2 className="size-4" /> : <UserRound className="size-4" />}
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-heading">{c.name}</span>
                        {c.organization && <span className="block text-xs text-muted-foreground">{c.organization}</span>}
                        {c.manifesto && <span className="mt-1 block text-xs text-muted-foreground">{c.manifesto}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
              {posCandidates.length === 0 && (
                <li className="text-sm text-muted-foreground">No candidates for this position.</li>
              )}
            </ul>
          </div>
        )
      })}

      <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-primary" />
        Your identity is separated from your selections. VAAP records only that you participated — anchored on the XRP
        Ledger — never how you voted.
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit ballot"}
      </button>
    </div>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { castVoteAction } from "@/app/actions/governance"

export function VoteForm({
  proposalId,
  voteType,
  options,
}: {
  proposalId: number
  voteType: string
  options: { id: number; label: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [choice, setChoice] = useState<string>("")
  const [optionId, setOptionId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [confirming, setConfirming] = useState(false)

  const yesNo = voteType === "yes_no_abstain"
  const selected = yesNo ? Boolean(choice) : Boolean(optionId)

  function submit() {
    setError("")
    startTransition(async () => {
      const res = await castVoteAction({
        proposalId,
        choice: yesNo ? choice : "option",
        optionId: yesNo ? null : optionId,
      })
      if (res.ok) {
        router.refresh()
      } else {
        setError(res.error ?? "Could not record your vote.")
        setConfirming(false)
      }
    })
  }

  const optionCard = (active: boolean) =>
    `flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-medium transition-colors ${
      active ? "border-green bg-mint text-heading" : "border-line bg-background text-heading hover:border-green/50"
    }`

  return (
    <div className="rounded-2xl border border-line bg-card p-6">
      <h2 className="mb-4 text-base font-bold text-heading">Cast your vote</h2>

      <div className="flex flex-col gap-3">
        {yesNo
          ? (["yes", "no", "abstain"] as const).map((c) => (
              <label key={c} className={optionCard(choice === c)}>
                <input type="radio" name="choice" value={c} checked={choice === c} onChange={() => setChoice(c)} className="size-4 accent-[var(--color-green)]" />
                <span className="capitalize">{c}</span>
              </label>
            ))
          : options.map((o) => (
              <label key={o.id} className={optionCard(optionId === o.id)}>
                <input type="radio" name="option" checked={optionId === o.id} onChange={() => setOptionId(o.id)} className="size-4 accent-[var(--color-green)]" />
                <span>{o.label}</span>
              </label>
            ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{error}</p>}

      {!confirming ? (
        <button
          type="button"
          disabled={!selected}
          onClick={() => setConfirming(true)}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-50"
        >
          Continue
        </button>
      ) : (
        <div className="mt-5 rounded-xl border border-green-border bg-mint p-4">
          <p className="text-sm font-medium text-heading">
            Your vote is final and cannot be changed once submitted. Confirm to record it.
          </p>
          <div className="mt-3 flex gap-2.5">
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
            >
              {pending ? "Recording…" : "Confirm vote"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-line bg-background px-5 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-card"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

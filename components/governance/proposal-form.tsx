"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { createProposalAction } from "@/app/actions/governance"

const inputClass =
  "w-full rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm text-heading outline-none transition-colors focus:border-green"
const labelClass = "mb-1.5 block text-sm font-semibold text-heading"

export function ProposalForm({ categories }: { categories: string[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [voteType, setVoteType] = useState("yes_no_abstain")
  const [eligibilityMode, setEligibilityMode] = useState("all_voting_members")

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    for (const key of ["opensAt", "closesAt"]) {
      const local = String(formData.get(key) ?? "")
      formData.set(key, local ? new Date(local).toISOString() : "")
    }
    const closes = String(formData.get("closesAt") ?? "")
    const opens = String(formData.get("opensAt") ?? "")
    if (!closes) {
      setError("Please set a voting expiry date.")
      return
    }
    if (new Date(closes).getTime() <= Date.now()) {
      setError("The voting expiry date must be in the future.")
      return
    }
    if (opens && new Date(opens).getTime() >= new Date(closes).getTime()) {
      setError("The voting expiry date must be after the opening date.")
      return
    }
    startTransition(async () => {
      const res = await createProposalAction(formData)
      if (res.ok && res.id) {
        router.push(`/admin/governance/${res.id}`)
        router.refresh()
      } else {
        setError(res.error ?? "Something went wrong.")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-2xl border border-line bg-card p-6">
      <div>
        <label className={labelClass} htmlFor="title">
          Title
        </label>
        <input id="title" name="title" required className={inputClass} placeholder="e.g. Adopt the 2026 governance charter" />
      </div>

      <div>
        <label className={labelClass} htmlFor="summary">
          Summary
        </label>
        <input id="summary" name="summary" className={inputClass} placeholder="One-line summary shown in lists" />
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          Full description
        </label>
        <textarea id="description" name="description" rows={5} className={inputClass} placeholder="The full text of the resolution members will vote on." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="category">
            Category
          </label>
          <input id="category" name="category" className={inputClass} defaultValue="Resolution" />
        </div>
        <div>
          <label className={labelClass} htmlFor="voteType">
            Vote type
          </label>
          <select
            id="voteType"
            name="voteType"
            className={inputClass}
            value={voteType}
            onChange={(e) => setVoteType(e.target.value)}
          >
            <option value="yes_no_abstain">Yes / No / Abstain</option>
            <option value="single_choice">Single choice</option>
            <option value="multi_choice">Multiple choice</option>
          </select>
        </div>
      </div>

      {voteType !== "yes_no_abstain" && (
        <div>
          <label className={labelClass} htmlFor="options">
            Options (one per line)
          </label>
          <textarea id="options" name="options" rows={4} className={inputClass} placeholder={"Option A\nOption B\nOption C"} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="visibility">
            Visibility
          </label>
          <select id="visibility" name="visibility" className={inputClass} defaultValue="open">
            <option value="open">Open (public register)</option>
            <option value="secret">Secret ballot</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="eligibilityMode">
            Who can vote
          </label>
          <select
            id="eligibilityMode"
            name="eligibilityMode"
            className={inputClass}
            value={eligibilityMode}
            onChange={(e) => setEligibilityMode(e.target.value)}
          >
            <option value="all_voting_members">All voting members</option>
            <option value="category">By membership category</option>
          </select>
        </div>
      </div>

      {eligibilityMode === "category" && (
        <div>
          <label className={labelClass} htmlFor="eligibleCategory">
            Eligible category
          </label>
          <select id="eligibleCategory" name="eligibleCategory" className={inputClass}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="quorum">
            Quorum (% of eligible)
          </label>
          <input id="quorum" name="quorum" type="number" min={0} max={100} defaultValue={0} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="passThreshold">
            Pass threshold (% yes)
          </label>
          <input id="passThreshold" name="passThreshold" type="number" min={1} max={100} defaultValue={50} className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="opensAt">
            Voting opens <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input id="opensAt" name="opensAt" type="datetime-local" className={inputClass} />
          <p className="mt-1 text-xs text-muted-foreground">Leave empty to open when you activate the proposal.</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="closesAt">
            Voting expires
          </label>
          <input id="closesAt" name="closesAt" type="datetime-local" required className={inputClass} />
          <p className="mt-1 text-xs text-muted-foreground">Votes are rejected after this date and time.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-background p-4">
        <p className="text-sm font-semibold text-heading">XRP Ledger anchoring (testnet)</p>
        <label className="flex items-center gap-3 text-sm text-heading">
          <input type="checkbox" name="anchorResultOnXrpl" defaultChecked className="size-4 accent-[var(--color-green)]" />
          Anchor the final result hash on-chain
        </label>
        <label className="flex items-center gap-3 text-sm text-heading">
          <input type="checkbox" name="recordIndividualVotesOnXrpl" className="size-4 accent-[var(--color-green)]" />
          Record each individual vote receipt on-chain
        </label>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create proposal"}
        </button>
      </div>
    </form>
  )
}

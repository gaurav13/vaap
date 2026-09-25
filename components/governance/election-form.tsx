"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { createElectionAction } from "@/app/actions/elections"

type PositionDraft = { key: number; title: string; seats: number }

export function ElectionForm({ categories }: { categories: string[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [eligibilityMode, setEligibilityMode] = useState("all_voting_members")
  const [positions, setPositions] = useState<PositionDraft[]>([{ key: 1, title: "", seats: 1 }])

  function addPosition() {
    setPositions((p) => [...p, { key: Date.now(), title: "", seats: 1 }])
  }
  function removePosition(key: number) {
    setPositions((p) => (p.length > 1 ? p.filter((x) => x.key !== key) : p))
  }
  function updatePosition(key: number, patch: Partial<PositionDraft>) {
    setPositions((p) => p.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  }

  function onSubmit(formData: FormData) {
    setError("")
    // Rebuild the position arrays from state (controlled inputs).
    formData.delete("positionTitle")
    formData.delete("positionSeats")
    for (const pos of positions) {
      formData.append("positionTitle", pos.title)
      formData.append("positionSeats", String(pos.seats))
    }
    startTransition(async () => {
      const res = await createElectionAction(formData)
      if (res.ok) router.push(`/admin/elections/${res.id}`)
      else setError(res.error ?? "Something went wrong.")
    })
  }

  const label = "block text-sm font-medium text-heading"
  const input =
    "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"

  return (
    <form action={onSubmit} className="space-y-6">
      <div>
        <label className={label} htmlFor="title">
          Election title
        </label>
        <input id="title" name="title" required className={input} placeholder="VAAP Executive Committee Election 2026" />
      </div>

      <div>
        <label className={label} htmlFor="description">
          Description
        </label>
        <textarea id="description" name="description" rows={3} className={input} placeholder="Purpose and context for members." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="opensAt">
            Opens at
          </label>
          <input id="opensAt" name="opensAt" type="datetime-local" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="closesAt">
            Closes at
          </label>
          <input id="closesAt" name="closesAt" type="datetime-local" className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="eligibilityMode">
            Who can vote
          </label>
          <select
            id="eligibilityMode"
            name="eligibilityMode"
            className={input}
            value={eligibilityMode}
            onChange={(e) => setEligibilityMode(e.target.value)}
          >
            <option value="all_voting_members">All voting members</option>
            <option value="specific_category">Specific membership category</option>
          </select>
        </div>
        {eligibilityMode === "specific_category" && (
          <div>
            <label className={label} htmlFor="eligibleCategory">
              Category
            </label>
            <select id="eligibleCategory" name="eligibleCategory" className={input}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-heading">Positions</h2>
          <button
            type="button"
            onClick={addPosition}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-heading transition hover:bg-muted"
          >
            <Plus className="size-3.5" />
            Add position
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Each position can have multiple seats. Voters may pick up to the number of seats available.
        </p>
        <div className="mt-4 space-y-3">
          {positions.map((pos) => (
            <div key={pos.key} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Position title</label>
                <input
                  value={pos.title}
                  onChange={(e) => updatePosition(pos.key, { title: e.target.value })}
                  className={input}
                  placeholder="Chairperson"
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-muted-foreground">Seats</label>
                <input
                  type="number"
                  min={1}
                  value={pos.seats}
                  onChange={(e) => updatePosition(pos.key, { seats: Number(e.target.value) })}
                  className={input}
                />
              </div>
              <button
                type="button"
                onClick={() => removePosition(pos.key)}
                className="mb-1 rounded-lg border border-border bg-background p-2 text-muted-foreground transition hover:text-destructive"
                aria-label="Remove position"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-heading">
        <input type="checkbox" name="anchorResultOnXrpl" defaultChecked className="size-4 rounded border-border" />
        Anchor participation and final results on the XRP Ledger
      </label>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create election"}
        </button>
      </div>
    </form>
  )
}

"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCheck, Search, Trash2, UserPlus } from "lucide-react"
import {
  addParticipant,
  checkInAllParticipants,
  removeParticipant,
  setParticipantCheckIn,
} from "@/app/actions/event-participants"

type Participant = {
  id: number
  name: string
  email: string
  isMember: boolean
  registeredAt: string
  checkedInAt: string | null
}

type Filter = "all" | "in" | "out"

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" })
}

export function ParticipantsManager({ eventId, participants }: { eventId: number; participants: Participant[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [error, setError] = useState<string | null>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return participants.filter((p) => {
      if (filter === "in" && !p.checkedInAt) return false
      if (filter === "out" && p.checkedInAt) return false
      return !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    })
  }, [participants, query, filter])

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn()
      router.refresh()
    })

  function onAdd(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await addParticipant(eventId, formData)
      if (!res.ok) {
        setError(res.error)
        return
      }
      formRef.current?.reset()
      router.refresh()
    })
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in", label: "Checked in" },
    { key: "out", label: "Not arrived" },
  ]

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={onAdd} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-end">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-navy">
          Name
          <input name="name" required maxLength={120} className="rounded-lg border border-border bg-background px-3 py-2 font-normal text-foreground" />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-navy">
          Email
          <input name="email" type="email" required maxLength={200} className="rounded-lg border border-border bg-background px-3 py-2 font-normal text-foreground" />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          <UserPlus className="size-4" />
          Add participant
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter participants">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.key ? "bg-green text-primary-foreground" : "border border-border text-muted-2 hover:bg-mint"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="relative flex-1 md:w-64">
            <span className="sr-only">Search participants</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={pending || participants.every((p) => p.checkedInAt)}
            onClick={() => run(() => checkInAllParticipants(eventId))}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-navy hover:bg-mint disabled:opacity-50"
          >
            <CheckCheck className="size-4" />
            Check in all
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-2">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Participant</th>
              <th scope="col" className="px-4 py-3 font-semibold">Type</th>
              <th scope="col" className="px-4 py-3 font-semibold">Registered</th>
              <th scope="col" className="px-4 py-3 font-semibold">Check-in</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-2">
                  {participants.length === 0 ? "No one has registered yet." : "No participants match."}
                </td>
              </tr>
            )}
            {visible.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-semibold text-heading">{p.name}</p>
                  <a href={`mailto:${p.email}`} className="text-muted-2 hover:text-green">{p.email}</a>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.isMember ? "bg-mint text-green" : "bg-muted text-muted-2"}`}>
                    {p.isMember ? "Member" : "Guest"}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-2">{formatDateTime(p.registeredAt)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setParticipantCheckIn(p.id, eventId, !p.checkedInAt))}
                    aria-pressed={Boolean(p.checkedInAt)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      p.checkedInAt ? "bg-green text-primary-foreground hover:opacity-90" : "border border-border text-navy hover:bg-mint"
                    }`}
                  >
                    {p.checkedInAt ? `In · ${formatDateTime(p.checkedInAt)}` : "Check in"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`Remove ${p.name} from this event?`)) run(() => removeParticipant(p.id, eventId))
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-2 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${p.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

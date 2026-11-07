"use client"

import { useMemo, useState, useTransition } from "react"
import {
  Ban,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  RotateCcw,
  Search,
  Send,
  Trash2,
  UserPlus,
  UserCheck,
  X,
} from "lucide-react"
import {
  addParticipant,
  checkInAllParticipants,
  emailParticipants,
  removeParticipant,
  resendParticipantVerification,
  setParticipantCheckIn,
  setParticipantStatus,
} from "@/app/actions/event-participants"

type Status = "pending" | "confirmed" | "cancelled"

export type ParticipantRow = {
  id: number
  name: string
  email: string
  organization: string
  status: Status
  isMember: boolean
  registeredAt: string
  verifiedAt: string | null
  verifySentAt: string | null
  checkedInAt: string | null
}

const TABS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
]

const STATUS_STYLE: Record<Status, string> = {
  confirmed: "bg-mint text-green",
  pending: "bg-amber-50 text-amber-800",
  cancelled: "bg-muted text-muted-2",
}

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-navy hover:bg-mint disabled:opacity-50"
const iconBtn = "inline-flex size-8 items-center justify-center rounded-md text-muted-2 hover:bg-mint hover:text-green disabled:opacity-40"

function fmt(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function ParticipantsManager({ eventId, participants }: { eventId: number; participants: ParticipantRow[] }) {
  const [tab, setTab] = useState<"all" | Status>("all")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [panel, setPanel] = useState<"add" | "email" | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const counts = useMemo(() => {
    const c = { all: participants.length, confirmed: 0, pending: 0, cancelled: 0 }
    for (const p of participants) c[p.status]++
    return c
  }, [participants])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return participants.filter(
      (p) =>
        (tab === "all" || p.status === tab) &&
        (!q || p.name.toLowerCase().includes(q) || p.email.includes(q) || p.organization.toLowerCase().includes(q)),
    )
  }, [participants, tab, query])

  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.id))

  function run(id: number | null, fn: () => Promise<{ ok: boolean; error?: string } | void>, success?: string) {
    setBusyId(id)
    setNotice(null)
    startTransition(async () => {
      try {
        const res = await fn()
        if (res && !res.ok) setNotice({ kind: "error", text: res.error ?? "Something went wrong." })
        else if (success) setNotice({ kind: "ok", text: success })
      } catch {
        setNotice({ kind: "error", text: "Something went wrong. Please try again." })
      } finally {
        setBusyId(null)
      }
    })
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) visible.forEach((p) => next.delete(p.id))
      else visible.forEach((p) => next.add(p.id))
      return next
    })
  }

  const exportQuery = tab === "all" ? "" : `&status=${tab}`

  return (
    <section className="flex flex-col gap-4" aria-label="Participants">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                tab === t.key ? "bg-green text-primary-foreground" : "text-muted-2 hover:text-heading"
              }`}
            >
              {t.label} <span className="tabular-nums opacity-80">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={ghostBtn} onClick={() => setPanel(panel === "add" ? null : "add")}>
            <UserPlus className="size-4" /> Add
          </button>
          <button type="button" className={ghostBtn} onClick={() => setPanel(panel === "email" ? null : "email")}>
            <Mail className="size-4" /> Email participants
          </button>
          <button
            type="button"
            className={ghostBtn}
            disabled={isPending || counts.confirmed === 0}
            onClick={() => run(null, () => checkInAllParticipants(eventId), "All confirmed participants checked in.")}
          >
            <UserCheck className="size-4" /> Check in all
          </button>
          <a className={ghostBtn} href={`/admin/events/${eventId}/participants/export?format=csv${exportQuery}`}>
            <Download className="size-4" /> CSV
          </a>
          <a
            className="inline-flex items-center gap-1.5 rounded-lg bg-green px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            href={`/admin/events/${eventId}/participants/export?format=xlsx${exportQuery}`}
          >
            <Download className="size-4" /> Excel
          </a>
        </div>
      </div>

      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm ${
            notice.kind === "error" ? "bg-red-50 text-red-700" : "bg-mint text-green"
          }`}
        >
          {notice.text}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      )}

      {panel === "add" && (
        <form
          className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
          action={(fd) =>
            run(null, async () => {
              const res = await addParticipant(eventId, fd)
              if (res.ok) setPanel(null)
              return res
            }, "Participant added as confirmed.")
          }
        >
          <label className="grid gap-1 text-xs font-semibold text-heading">
            Name
            <input name="name" required maxLength={120} className={inputClass} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-heading">
            Email
            <input name="email" type="email" required maxLength={200} className={inputClass} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-heading">
            Organization
            <input name="organization" maxLength={160} className={inputClass} />
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-2">
              <input type="checkbox" name="notify" defaultChecked className="size-4 accent-green" />
              Send confirmation
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isPending && busyId === null && <Loader2 className="size-4 animate-spin" />}
              Add
            </button>
          </div>
        </form>
      )}

      {panel === "email" && (
        <form
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
          action={(fd) => {
            fd.set("ids", Array.from(selected).join(","))
            setNotice(null)
            setBusyId(null)
            startTransition(async () => {
              try {
                const res = await emailParticipants(eventId, fd)
                if (!res.ok) setNotice({ kind: "error", text: res.error })
                else {
                  setNotice({
                    kind: res.failed ? "error" : "ok",
                    text: `Sent to ${res.sent} participant${res.sent === 1 ? "" : "s"}${res.failed ? `, ${res.failed} failed` : ""}.`,
                  })
                  setPanel(null)
                }
              } catch {
                setNotice({ kind: "error", text: "Couldn't send the emails. Please try again." })
              }
            })
          }}
        >
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <label className="grid gap-1 text-xs font-semibold text-heading">
              Send to
              <select name="audience" defaultValue={selected.size ? "selected" : "confirmed"} className={inputClass}>
                <option value="confirmed">Confirmed ({counts.confirmed})</option>
                <option value="pending">Pending verification ({counts.pending})</option>
                <option value="all">Confirmed + pending ({counts.confirmed + counts.pending})</option>
                <option value="selected" disabled={selected.size === 0}>
                  Selected ({selected.size})
                </option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-heading">
              Subject
              <input name="subject" required maxLength={200} placeholder="Reminder: doors open at 2:30 PM" className={inputClass} />
            </label>
          </div>
          <label className="grid gap-1 text-xs font-semibold text-heading">
            Message
            <textarea
              name="message"
              required
              maxLength={5000}
              rows={5}
              placeholder="Write your update. Event date, location and a link are added automatically."
              className={`${inputClass} leading-relaxed`}
            />
          </label>
          <p className="text-xs text-muted-2">
            Uses the &quot;Event Participant Update&quot; template from Email Templates. Supports **bold** and [links](https://…).
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className={ghostBtn} onClick={() => setPanel(null)}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send email
            </button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" aria-hidden />
        <label htmlFor="participant-search" className="sr-only">
          Search participants
        </label>
        <input
          id="participant-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or organization"
          className={`${inputClass} w-full pl-9`}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-2">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all visible"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  className="size-4 accent-green"
                />
              </th>
              <th className="px-3 py-3 font-semibold">Participant</th>
              <th className="px-3 py-3 font-semibold">Organization</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Registered</th>
              <th className="px-3 py-3 font-semibold">Check-in</th>
              <th className="px-3 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-2">
                  {participants.length === 0 ? "No registrations yet." : "No participants match this filter."}
                </td>
              </tr>
            )}
            {visible.map((p) => {
              const busy = isPending && busyId === p.id
              return (
                <tr key={p.id} className={busy ? "opacity-60" : undefined}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.name}`}
                      checked={selected.has(p.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (next.has(p.id)) next.delete(p.id)
                          else next.add(p.id)
                          return next
                        })
                      }
                      className="size-4 accent-green"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-heading">{p.name}</p>
                    <p className="text-xs text-muted-2">
                      {p.email}
                      {p.isMember && <span className="ml-2 rounded bg-mint px-1.5 py-0.5 font-semibold text-green">Member</span>}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-muted-2">{p.organization || "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[p.status]}`}>
                      {p.status}
                    </span>
                    <p className="mt-1 text-xs text-muted-2">
                      {p.status === "confirmed"
                        ? p.verifiedAt
                          ? `Verified ${fmt(p.verifiedAt)}`
                          : "Confirmed by staff"
                        : p.status === "pending" && p.verifySentAt
                          ? `Link sent ${fmt(p.verifySentAt)}`
                          : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-muted-2">{fmt(p.registeredAt)}</td>
                  <td className="px-3 py-3">
                    {p.status === "confirmed" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(p.id, () => setParticipantCheckIn(p.id, eventId, !p.checkedInAt))}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
                          p.checkedInAt ? "bg-mint text-green" : "border border-border text-navy hover:bg-mint"
                        }`}
                      >
                        <CheckCircle2 className="size-3.5" />
                        {p.checkedInAt ? `In · ${fmt(p.checkedInAt)}` : "Check in"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-2">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      {p.status === "pending" && (
                        <button
                          type="button"
                          title="Resend verification email"
                          aria-label={`Resend verification to ${p.name}`}
                          disabled={busy}
                          className={iconBtn}
                          onClick={() => run(p.id, () => resendParticipantVerification(p.id, eventId), `Verification sent to ${p.email}.`)}
                        >
                          <Send className="size-4" />
                        </button>
                      )}
                      {p.status !== "confirmed" && (
                        <button
                          type="button"
                          title="Confirm manually"
                          aria-label={`Confirm ${p.name}`}
                          disabled={busy}
                          className={iconBtn}
                          onClick={() => run(p.id, () => setParticipantStatus(p.id, eventId, "confirmed"), `${p.name} confirmed.`)}
                        >
                          {p.status === "cancelled" ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4" />}
                        </button>
                      )}
                      {p.status !== "cancelled" && (
                        <button
                          type="button"
                          title="Cancel registration"
                          aria-label={`Cancel ${p.name}'s registration`}
                          disabled={busy}
                          className={iconBtn}
                          onClick={() => run(p.id, () => setParticipantStatus(p.id, eventId, "cancelled"), `${p.name}'s registration cancelled.`)}
                        >
                          <Ban className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Delete"
                        aria-label={`Delete ${p.name}`}
                        disabled={busy}
                        className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
                        onClick={() => {
                          if (confirm(`Permanently delete ${p.name}'s registration?`)) run(p.id, () => removeParticipant(p.id, eventId))
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-2">
        Showing {visible.length} of {participants.length}
        {selected.size > 0 && ` · ${selected.size} selected`}
      </p>
    </section>
  )
}

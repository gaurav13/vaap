"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, Check, Eye, MapPin, Pencil, Plus, Trash2, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createEvent, updateEvent, deleteEvent, setEventStatus } from "@/app/actions/admin"

type EventItem = {
  id: number
  title: string
  description: string
  location: string
  timeLabel: string
  startsAt: string
  published: boolean
  status: string
  hostName: string
  coverImage: string
  submittedByName: string
}

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-mint text-green",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
}

function toInputValue(iso: string) {
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60000)
  return local.toISOString().slice(0, 16)
}

export function EventsManager({ items }: { items: EventItem[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = editing ? await updateEvent(editing.id, formData) : await createEvent(formData)
      if (res && !res.ok) {
        setError(res.error ?? "Something went wrong.")
        return
      }
      setEditing(null)
      setCreating(false)
      router.refresh()
    })
  }

  function onDelete(id: number) {
    startTransition(async () => {
      await deleteEvent(id)
      router.refresh()
    })
  }

  function onSetStatus(id: number, status: "approved" | "pending" | "rejected") {
    startTransition(async () => {
      await setEventStatus(id, status)
      router.refresh()
    })
  }

  const showForm = creating || editing !== null

  return (
    <div className="mt-6">
      {!showForm && (
        <Button onClick={() => setCreating(true)} className="mb-6">
          <Plus className="size-4" /> New Event
        </Button>
      )}

      {showForm && (
        <form onSubmit={onSubmit} className="mb-8 rounded-xl border border-line bg-card p-6" key={editing?.id ?? "new"}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-heading">{editing ? "Edit Event" : "New Event"}</h2>
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setCreating(false)
                setError(null)
              }}
              className="text-muted-2 hover:text-navy"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            <Field label="Title">
              <input name="title" defaultValue={editing?.title} required className={inputCls} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts at">
                <input
                  type="datetime-local"
                  name="startsAt"
                  defaultValue={editing ? toInputValue(editing.startsAt) : ""}
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Time label">
                <input name="timeLabel" defaultValue={editing?.timeLabel} placeholder="7:00 PM – 8:00 PM (PKT)" className={inputCls} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location">
                <input name="location" defaultValue={editing?.location} placeholder="Online / City, Country" className={inputCls} />
              </Field>
              <Field label="Host name">
                <input name="hostName" defaultValue={editing?.hostName} placeholder="Organizer or partner" className={inputCls} />
              </Field>
            </div>
            <Field label="Cover image URL">
              <input name="coverImage" defaultValue={editing?.coverImage} placeholder="https://…" className={inputCls} />
            </Field>
            <Field label="Description">
              <textarea name="description" defaultValue={editing?.description} rows={4} className={inputCls} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                name="published"
                defaultChecked={editing ? editing.published : true}
                className="size-4 accent-[var(--color-green)]"
              />
              Published (visible on the public site)
            </label>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-5 flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save Changes" : "Create Event"}
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-2">No events yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-heading">{item.title}</p>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_BADGE[item.status] ?? STATUS_BADGE.pending}`}>
                      {item.status}
                    </span>
                    {!item.published && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-2">Draft</span>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-2">
                    <CalendarDays className="size-3.5" />
                    {new Date(item.startsAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  {item.location && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-2">
                      <MapPin className="size-3.5" /> {item.location}
                    </p>
                  )}
                  {item.submittedByName && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-2">
                      <User className="size-3.5" /> Submitted by {item.submittedByName}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {item.status !== "approved" && (
                    <button
                      type="button"
                      onClick={() => onSetStatus(item.id, "approved")}
                      disabled={pending}
                      className="flex size-9 items-center justify-center rounded-md text-green transition-colors hover:bg-mint"
                      aria-label="Approve"
                      title="Approve"
                    >
                      <Check className="size-4" />
                    </button>
                  )}
                  {item.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => onSetStatus(item.id, "rejected")}
                      disabled={pending}
                      className="flex size-9 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Reject"
                      title="Reject"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                  <a
                    href={`/events/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex size-9 items-center justify-center rounded-md transition-colors ${
                      item.published
                        ? "text-muted-2 hover:bg-mint hover:text-green"
                        : "pointer-events-none text-muted-2/40"
                    }`}
                    aria-label={item.published ? "View on public events page" : "Publish to view live"}
                    title={item.published ? "View on public events page" : "Publish to view live"}
                  >
                    <Eye className="size-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(item)
                      setCreating(false)
                    }}
                    className="flex size-9 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-mint hover:text-navy"
                    aria-label="Edit"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    disabled={pending}
                    className="flex size-9 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm text-heading outline-none transition-colors focus:border-green-border focus:ring-2 focus:ring-green/20"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-body">{label}</span>
      {children}
    </label>
  )
}

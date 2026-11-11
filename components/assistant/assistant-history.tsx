"use client"

import { Check, MessageSquareText, Pencil, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import type { ConversationSummary } from "@/lib/ai-assistant/history"
import { cn } from "@/lib/utils"

type Props = {
  conversations: ConversationSummary[] | undefined
  activeId: string
  onOpen: (id: string) => void
  onNew: () => void
  onChanged: () => void
}

function when(iso: string) {
  const d = new Date(iso)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

export function AssistantHistory({ conversations, activeId, onOpen, onNew, onChanged }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function rename(id: string) {
    const title = draft.trim()
    setEditing(null)
    if (!title) return
    const res = await fetch(`/api/assistant/conversations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(() => null)
    if (!res?.ok) setError("Couldn't rename that conversation.")
    onChanged()
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return
    const res = await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" }).catch(() => null)
    if (!res?.ok) setError("Couldn't delete that conversation.")
    else if (id === activeId) onNew()
    onChanged()
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onNew}
        className="flex h-10 items-center justify-center gap-2 rounded-full border border-green-border text-sm font-semibold text-green transition-colors hover:bg-mint"
      >
        <Plus className="size-4" aria-hidden />
        New conversation
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!conversations ? (
        <p className="py-6 text-center text-sm text-muted-2">Loading conversations...</p>
      ) : conversations.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-2">No saved conversations yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5" aria-label="Saved conversations">
          {conversations.map((c) => (
            <li
              key={c.id}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2",
                c.id === activeId ? "border-green-border bg-mint" : "border-line-light bg-card",
              )}
            >
              {editing === c.id ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault()
                    rename(c.id)
                  }}
                >
                  <label htmlFor={`rename-${c.id}`} className="sr-only">
                    Conversation name
                  </label>
                  <input
                    id={`rename-${c.id}`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
                      if (e.key === "Escape") {
                        e.stopPropagation()
                        setEditing(null)
                      }
                    }}
                    maxLength={120}
                    autoFocus
                    className="min-w-0 flex-1 rounded-md border border-line bg-card px-2 py-1 text-sm text-heading outline-none focus:border-green"
                  />
                  <button type="submit" className="flex size-8 items-center justify-center rounded-full text-green hover:bg-mint" aria-label="Save name">
                    <Check className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="flex size-8 items-center justify-center rounded-full text-muted-2 hover:bg-surface"
                    aria-label="Cancel rename"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onOpen(c.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-start"
                    aria-current={c.id === activeId ? "true" : undefined}
                  >
                    <MessageSquareText className="size-4 shrink-0 text-green" aria-hidden />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold text-heading" dir="auto">
                        {c.title}
                      </span>
                      <span className="text-xs text-muted-2">
                        {when(c.lastActivityAt)} · {c.messageCount} {c.messageCount === 1 ? "message" : "messages"}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(c.title)
                      setEditing(c.id)
                    }}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-2 hover:bg-surface hover:text-heading"
                    aria-label={`Rename ${c.title}`}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c.id, c.title)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-2 hover:bg-surface hover:text-destructive"
                    aria-label={`Delete ${c.title}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Mail, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { setMessageHandled } from "@/app/actions/admin"

type Message = {
  id: number
  name: string
  email: string
  subject: string
  message: string
  handled: boolean
  createdAt: string
}

export function MessagesManager({ items }: { items: Message[] }) {
  const router = useRouter()
  const [showHandled, setShowHandled] = useState(false)
  const [pending, startTransition] = useTransition()

  function toggle(id: number, handled: boolean) {
    startTransition(async () => {
      await setMessageHandled(id, handled)
      router.refresh()
    })
  }

  const visible = showHandled ? items : items.filter((i) => !i.handled)

  return (
    <div className="mt-6">
      <label className="mb-6 flex items-center gap-2 text-sm text-body">
        <input
          type="checkbox"
          checked={showHandled}
          onChange={(e) => setShowHandled(e.target.checked)}
          className="size-4 accent-[var(--color-green)]"
        />
        Show handled messages
      </label>

      <div className="grid gap-4">
        {visible.length === 0 && (
          <p className="rounded-xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
            No {showHandled ? "" : "unhandled "}messages.
          </p>
        )}
        {visible.map((m) => (
          <div key={m.id} className={cn("rounded-xl border bg-card p-5", m.handled ? "border-line opacity-70" : "border-green-border")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-heading">{m.subject || "(No subject)"}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-2">
                  <Mail className="size-3.5" /> {m.name} · {m.email}
                </p>
              </div>
              <p className="text-xs text-muted-2">
                {new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-body">{m.message}</p>
            <div className="mt-4 flex gap-2">
              <a
                href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || "Your VAAP inquiry")}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-body transition-colors hover:bg-mint"
              >
                <Mail className="size-4" /> Reply
              </a>
              {m.handled ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggle(m.id, false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-body transition-colors hover:bg-mint"
                >
                  <RotateCcw className="size-4" /> Mark unhandled
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggle(m.id, true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
                >
                  <Check className="size-4" /> Mark handled
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

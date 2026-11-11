"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { POST_STATUSES, type PostStatus } from "@/lib/social-agent/config"

type ActionResult = { ok: true } | { ok: false; error: string }

/** Runs a server action, refreshes the page on success and keeps the latest message for display. */
export function useAgentAction() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null)
  function run<T extends ActionResult>(fn: () => Promise<T>, success?: string | ((r: T) => string), after?: (r: T) => void) {
    setMessage(null)
    start(async () => {
      const result = await fn()
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error })
        return
      }
      if (success) setMessage({ tone: "success", text: typeof success === "function" ? success(result) : success })
      after?.(result)
      router.refresh()
    })
  }
  return { pending, message, setMessage, run }
}

export function Notice({ message }: { message: { tone: "error" | "success"; text: string } | null }) {
  if (!message) return null
  return (
    <p
      role={message.tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        message.tone === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-green-border bg-mint text-green",
      )}
    >
      {message.text}
    </p>
  )
}

const TONES: Record<PostStatus, string> = {
  needs_review: "bg-warning-bg text-warning",
  pending_approval: "bg-blue-tint text-indigo",
  approved: "bg-mint text-green",
  scheduled: "bg-gold-tint text-amber",
  published: "bg-green text-primary-foreground",
  rejected: "bg-muted text-muted-foreground",
}

export function StatusBadge({ status }: { status: string }) {
  const s = (status in POST_STATUSES ? status : "needs_review") as PostStatus
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", TONES[s])}>{POST_STATUSES[s]}</span>
}

export const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

"use client"

import { ThumbsDown, ThumbsUp } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

type Rating = 1 | -1

export function AssistantFeedback({ requestId }: { requestId: string }) {
  const [rating, setRating] = useState<Rating | null>(null)
  const [comment, setComment] = useState("")
  const [state, setState] = useState<"idle" | "commenting" | "sent" | "error">("idle")

  async function send(next: Rating, note = "") {
    setRating(next)
    const res = await fetch("/api/assistant/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, rating: next, comment: note }),
    }).catch(() => null)
    if (!res?.ok) return setState("error")
    setState(next === -1 && !note ? "commenting" : "sent")
  }

  return (
    <div className="flex flex-col gap-1.5 ps-9">
      <div className="flex items-center gap-1 text-muted-2">
        <span className="me-1 text-xs">Was this helpful?</span>
        {([1, -1] as const).map((r) => {
          const Icon = r === 1 ? ThumbsUp : ThumbsDown
          return (
            <button
              key={r}
              type="button"
              onClick={() => send(r)}
              aria-pressed={rating === r}
              aria-label={r === 1 ? "Helpful" : "Not helpful"}
              className={cn(
                "flex size-7 items-center justify-center rounded-full transition-colors hover:bg-surface hover:text-green",
                rating === r && "bg-mint text-green",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </button>
          )
        })}
        {state === "sent" && <span className="text-xs text-green">Thanks for the feedback.</span>}
        {state === "error" && <span className="text-xs text-destructive">Could not save feedback.</span>}
      </div>
      {state === "commenting" && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(-1, comment.trim() || " ")
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor={`fb-${requestId}`} className="sr-only">
            What was wrong with this answer?
          </label>
          <input
            id={`fb-${requestId}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            placeholder="What was missing? (optional)"
            className="min-w-0 flex-1 rounded-full border border-line bg-card px-3 py-1.5 text-xs text-heading outline-none focus:border-green"
          />
          <button type="submit" className="rounded-full bg-green-hover px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-green">
            Send
          </button>
        </form>
      )}
    </div>
  )
}

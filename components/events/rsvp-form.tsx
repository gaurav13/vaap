"use client"

import { useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { rsvpToEvent } from "@/app/actions/public"

export function RsvpForm({
  eventId,
  defaultName = "",
  defaultEmail = "",
}: {
  eventId: number
  defaultName?: string
  defaultEmail?: string
}) {
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function action(formData: FormData) {
    setPending(true)
    setError(null)
    const res = await rsvpToEvent(formData)
    setPending(false)
    if (res.ok) {
      setDone(true)
    } else {
      setError(res.error ?? "Something went wrong. Please try again.")
    }
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-green/30 bg-mint p-5 text-green">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-bold text-heading">You&apos;re registered</p>
          <p className="mt-1 text-sm text-body">
            We&apos;ve saved your spot. Watch your inbox for event details and updates.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid gap-1.5">
        <label htmlFor="rsvp-name" className="text-xs font-semibold text-heading">
          Full name
        </label>
        <input
          id="rsvp-name"
          name="name"
          required
          defaultValue={defaultName}
          placeholder="Your name"
          className="rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-body outline-none transition focus:border-green focus:ring-2 focus:ring-green/20"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="rsvp-email" className="text-xs font-semibold text-heading">
          Email address
        </label>
        <input
          id="rsvp-email"
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          placeholder="you@example.com"
          className="rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-body outline-none transition focus:border-green focus:ring-2 focus:ring-green/20"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green/90 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Registering…
          </>
        ) : (
          "Register for this event"
        )}
      </button>
    </form>
  )
}

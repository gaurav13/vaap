"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { submitMemberEvent } from "@/app/actions/member"

const field =
  "w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-body outline-none transition focus:border-green focus:ring-2 focus:ring-green/20"
const label = "text-xs font-semibold text-heading"

export function SubmitEventForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function action(formData: FormData) {
    setPending(true)
    setError(null)
    const res = await submitMemberEvent(formData)
    setPending(false)
    if (res.ok) {
      router.push("/dashboard/events?submitted=1")
      router.refresh()
    } else {
      setError(res.error ?? "Something went wrong.")
    }
  }

  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-line bg-card p-6">
      <div className="grid gap-1.5">
        <label htmlFor="ev-title" className={label}>
          Event title
        </label>
        <input id="ev-title" name="title" required placeholder="e.g. Web3 Builders Meetup Karachi" className={field} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="ev-date" className={label}>
            Date
          </label>
          <input id="ev-date" name="date" type="date" required className={field} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="ev-time" className={label}>
            Time
          </label>
          <input id="ev-time" name="timeLabel" placeholder="e.g. 6:00 PM – 9:00 PM" className={field} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="ev-location" className={label}>
          Location
        </label>
        <input id="ev-location" name="location" placeholder="Venue or online link" className={field} />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="ev-cover" className={label}>
          Cover image URL <span className="font-normal text-muted-2">(optional)</span>
        </label>
        <input id="ev-cover" name="coverImage" placeholder="https://…" className={field} />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="ev-desc" className={label}>
          Description
        </label>
        <textarea
          id="ev-desc"
          name="description"
          rows={5}
          placeholder="What's the event about, who should attend, and what to expect?"
          className={field}
        />
      </div>

      <p className="rounded-lg bg-mint px-3 py-2.5 text-xs text-green">
        Submitted events are reviewed by the VAAP team before appearing publicly.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green/90 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Submitting…
          </>
        ) : (
          "Submit event for review"
        )}
      </button>
    </form>
  )
}

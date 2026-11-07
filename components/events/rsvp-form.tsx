"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, MailCheck } from "lucide-react"
import { resendRsvpVerification, rsvpToEvent, type RsvpResult } from "@/app/actions/public"

const inputClass =
  "rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-body outline-none transition focus:border-green focus:ring-2 focus:ring-green/20"

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
  const [result, setResult] = useState<RsvpResult | null>(null)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  async function action(formData: FormData) {
    setPending(true)
    setResendMessage(null)
    try {
      setResult(await rsvpToEvent(formData))
    } catch {
      setResult({ ok: false, error: "Something went wrong. Please try again." })
    } finally {
      setPending(false)
    }
  }

  async function resend(email: string) {
    setResending(true)
    const fd = new FormData()
    fd.set("eventId", String(eventId))
    fd.set("email", email)
    try {
      const res = await resendRsvpVerification(fd)
      setResendMessage(res.message)
    } catch {
      setResendMessage("Couldn't resend right now. Please try again shortly.")
    } finally {
      setResending(false)
    }
  }

  if (result?.ok && result.status === "confirmed") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-green/30 bg-mint p-5 text-green">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-bold text-heading">{result.already ? "You're already registered" : "You're confirmed"}</p>
          <p className="mt-1 text-sm leading-relaxed text-body">
            Your seat is reserved. We&apos;ll email event details and updates to you.
          </p>
        </div>
      </div>
    )
  }

  if (result?.ok && result.status === "pending") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-green/30 bg-mint p-5 text-green">
        <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="flex flex-col gap-2">
          <p className="font-bold text-heading">Check your inbox to confirm</p>
          <p className="text-sm leading-relaxed text-body">
            We sent a confirmation link to <span className="font-semibold text-heading">{result.email}</span>. Your seat
            is reserved once you confirm. The link expires in 24 hours.
          </p>
          {(resendMessage ?? result.notice) && (
            <p className="text-xs leading-relaxed text-body">{resendMessage ?? result.notice}</p>
          )}
          <button
            type="button"
            onClick={() => resend(result.email)}
            disabled={resending}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-green underline underline-offset-4 disabled:opacity-60"
          >
            {resending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Resend confirmation email
          </button>
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
          maxLength={120}
          autoComplete="name"
          defaultValue={defaultName}
          placeholder="Your name"
          className={inputClass}
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
          maxLength={200}
          autoComplete="email"
          defaultValue={defaultEmail}
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="rsvp-org" className="text-xs font-semibold text-heading">
          Organization <span className="font-normal text-body">(optional)</span>
        </label>
        <input
          id="rsvp-org"
          name="organization"
          maxLength={160}
          autoComplete="organization"
          placeholder="Company or institution"
          className={inputClass}
        />
      </div>
      {result && !result.ok && (
        <p role="alert" className="text-sm text-red-600">
          {result.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green/90 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden /> Registering…
          </>
        ) : (
          "Register for this event"
        )}
      </button>
    </form>
  )
}

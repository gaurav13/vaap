import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, Clock, MailCheck, XCircle } from "lucide-react"
import type { ReactNode } from "react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { confirmRsvpAction, getEventById } from "@/app/actions/public"
import { formatEventDate, inspectToken } from "@/lib/event-registration"
import { eventPath } from "@/lib/event-slug"

export const metadata: Metadata = {
  title: "Confirm your registration | VAAP Events",
  robots: { index: false, follow: false },
}

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-background p-8 text-center shadow-sm">
      <div className="flex size-12 items-center justify-center rounded-full bg-mint text-green">{icon}</div>
      <h1 className="text-balance text-2xl font-bold text-heading">{title}</h1>
      {children}
    </div>
  )
}

const primaryBtn =
  "inline-flex items-center justify-center rounded-lg bg-green px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green/90"

export default async function ConfirmRsvpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; confirmed?: string }>
}) {
  const { token, confirmed } = await searchParams

  let content: ReactNode
  if (confirmed) {
    const ev = await getEventById(Number.parseInt(confirmed, 10))
    content = (
      <Panel icon={<CheckCircle2 className="size-6" aria-hidden />} title="You're confirmed">
        <p className="text-pretty leading-relaxed text-body">
          {ev ? (
            <>
              Your seat for <span className="font-semibold text-heading">{ev.title}</span> on {formatEventDate(ev)} is
              reserved. A confirmation email is on its way.
            </>
          ) : (
            "Your registration is confirmed. A confirmation email is on its way."
          )}
        </p>
        <Link href={ev ? eventPath(ev) : "/events"} className={primaryBtn}>
          {ev ? "View event details" : "Browse events"}
        </Link>
      </Panel>
    )
  } else {
    const state = await inspectToken(token)
    if (state.state === "valid") {
      content = (
        <Panel icon={<MailCheck className="size-6" aria-hidden />} title="Confirm your registration">
          <p className="text-pretty leading-relaxed text-body">
            Confirm <span className="font-semibold text-heading">{state.email}</span> to reserve your seat for{" "}
            <span className="font-semibold text-heading">{state.event.title}</span> on {formatEventDate(state.event)}.
          </p>
          <form action={confirmRsvpAction}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className={primaryBtn}>
              Confirm my registration
            </button>
          </form>
        </Panel>
      )
    } else if (state.state === "used") {
      content = (
        <Panel icon={<CheckCircle2 className="size-6" aria-hidden />} title="Already confirmed">
          <p className="text-pretty leading-relaxed text-body">
            This link has already been used. Your registration for{" "}
            <span className="font-semibold text-heading">{state.event.title}</span> is on record.
          </p>
          <Link href={eventPath(state.event)} className={primaryBtn}>
            View event details
          </Link>
        </Panel>
      )
    } else if (state.state === "expired") {
      content = (
        <Panel icon={<Clock className="size-6" aria-hidden />} title="This link has expired">
          <p className="text-pretty leading-relaxed text-body">
            Confirmation links are valid for 24 hours. Register again on the event page with the same email and
            we&apos;ll send you a fresh link.
          </p>
          <Link href={eventPath(state.event)} className={primaryBtn}>
            Back to {state.event.title}
          </Link>
        </Panel>
      )
    } else {
      content = (
        <Panel icon={<XCircle className="size-6" aria-hidden />} title="Invalid confirmation link">
          <p className="text-pretty leading-relaxed text-body">
            This link is invalid or has been replaced by a newer one. Use the most recent email we sent, or register
            again from the event page.
          </p>
          <Link href="/events" className={primaryBtn}>
            Browse events
          </Link>
        </Panel>
      )
    }
  }

  return (
    <>
      <SiteHeaderServer />
      <main className="flex min-h-[60vh] items-center justify-center bg-surface px-4 py-16">
        <div className="w-full max-w-md">{content}</div>
      </main>
      <SiteFooter />
    </>
  )
}

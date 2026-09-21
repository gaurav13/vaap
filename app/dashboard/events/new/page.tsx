import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getSession } from "@/lib/session"
import { canPublishEvents } from "@/app/actions/member"
import { PageHeading } from "@/components/member/page-heading"
import { SubmitEventForm } from "@/components/member/submit-event-form"

export default async function NewEventPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const allowed = await canPublishEvents()

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/dashboard/events"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green transition hover:opacity-80"
      >
        <ArrowLeft className="size-4" /> Back to events
      </Link>
      <PageHeading title="Publish an event" description="Share an event with the VAAP community. Submissions are reviewed before going live." />

      {allowed ? (
        <SubmitEventForm />
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
          <p className="text-sm font-semibold text-heading">Members only</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-2">
            Publishing events is available to active VAAP members in good standing. Complete your membership to unlock
            event publishing.
          </p>
          <Link
            href="/dashboard/membership"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-green px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green/90"
          >
            View membership
          </Link>
        </div>
      )}
    </div>
  )
}

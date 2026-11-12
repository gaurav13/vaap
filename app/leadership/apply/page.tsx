import Link from "next/link"
import type { Metadata } from "next"
import { getSession } from "@/lib/session"
import { getMyLeadershipApplication } from "@/app/actions/leadership"
import { STATUS_LABELS } from "@/lib/leadership"
import { LeadershipApplicationForm } from "@/components/leadership/application-form"

export const metadata: Metadata = {
  title: "Apply for VAAP Leadership",
  description: "Apply to join the VAAP Executive Committee, Advisory Board or Industry Advisors.",
  alternates: { canonical: "/leadership/apply" },
}

export default async function LeadershipApplyPage() {
  const session = await getSession()
  const existing = session?.user ? await getMyLeadershipApplication() : null
  const underReview = existing && (existing.status === "pending" || existing.status === "in_review")

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-green">VAAP Leadership</p>
        <h1 className="font-serif text-3xl font-bold text-heading text-balance md:text-4xl">Apply to serve on VAAP leadership</h1>
        <p className="leading-relaxed text-muted-2 text-pretty">
          Share your professional background. Every application is reviewed by the VAAP team, and nothing is published
          until it is approved.
        </p>
      </header>

      {!session?.user ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-card p-6">
          <p className="leading-relaxed text-heading">Sign in to your VAAP account to apply.</p>
          <div className="flex gap-3">
            <Link href="/sign-in?callbackUrl=/leadership/apply" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green/90">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-heading hover:border-green">
              Create account
            </Link>
          </div>
        </div>
      ) : underReview ? (
        <div role="status" className="flex flex-col gap-2 rounded-xl border border-line bg-card p-6">
          <p className="font-semibold text-heading">Your application is {STATUS_LABELS[existing.status].toLowerCase()}.</p>
          <p className="leading-relaxed text-muted-2">
            Submitted {existing.submittedAt?.toLocaleDateString("en-GB", { dateStyle: "medium" })}. We will contact you once
            it has been reviewed.
          </p>
        </div>
      ) : (
        <>
          {existing?.status === "rejected" && existing.reviewNote && (
            <div className="rounded-xl border border-line bg-card p-4 text-sm leading-relaxed text-muted-2">
              <span className="font-semibold text-heading">Previous application feedback: </span>
              {existing.reviewNote}
            </div>
          )}
          <LeadershipApplicationForm defaultEmail={session.user.email ?? ""} defaultName={session.user.name ?? ""} />
        </>
      )}
    </main>
  )
}

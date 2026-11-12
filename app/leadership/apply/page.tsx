import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Clock, LogIn } from "lucide-react"
import { getSession } from "@/lib/session"
import { getMyLeadershipApplication } from "@/app/actions/leadership"
import { STATUS_LABELS } from "@/lib/leadership"
import { LeadershipApplicationForm } from "@/components/leadership/application-form"
import { ApplySidebar } from "@/components/leadership/apply-sidebar"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"

export const metadata: Metadata = {
  title: "Apply for VAAP Leadership",
  description: "Apply to join the VAAP Executive Committee, Advisory Board or Industry Advisors.",
  alternates: { canonical: "/leadership/apply" },
}

export default async function LeadershipApplyPage() {
  const [session, user] = await Promise.all([getSession(), getHeaderUser()])
  const existing = session?.user ? await getMyLeadershipApplication() : null
  const underReview = existing && (existing.status === "pending" || existing.status === "in_review")

  return (
    <>
      <SiteHeaderServer active="About" user={user} />
      <main className="bg-background">
        <section className="border-b border-line-light bg-mint-2">
          <div className="vaap-container flex flex-col gap-5 py-12 md:py-16">
            <nav aria-label="Breadcrumb" className="text-sm text-muted-2">
              <ol className="flex items-center gap-2">
                <li>
                  <Link href="/about#leadership" className="hover:text-green">
                    Leadership
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="font-medium text-heading">
                  Apply
                </li>
              </ol>
            </nav>
            <div className="flex items-center gap-4">
              <span className="h-0.5 w-12 bg-green" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-green">VAAP Leadership</span>
            </div>
            <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight text-navy text-balance md:text-5xl">
              Apply to serve on <span className="text-green">VAAP leadership</span>
            </h1>
            <p className="max-w-2xl leading-relaxed text-body text-pretty">
              Help shape Pakistan&apos;s virtual asset industry. Share your professional background — every application
              is reviewed by the VAAP team, and nothing is published until it is approved.
            </p>
          </div>
        </section>

        <div className="vaap-container grid gap-8 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
          <div className="flex min-w-0 flex-col gap-6">
            {!session?.user ? (
              <div className="flex flex-col items-start gap-5 rounded-2xl border border-line bg-card p-6 shadow-sm md:p-8">
                <span className="flex size-11 items-center justify-center rounded-full bg-mint text-green">
                  <LogIn className="size-5" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-2">
                  <h2 className="font-serif text-2xl font-semibold text-heading">Sign in to start your application</h2>
                  <p className="leading-relaxed text-muted-2">
                    Applications are linked to your VAAP account so you can track their status and receive feedback.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/sign-in?callbackUrl=/leadership/apply"
                    className="group inline-flex items-center gap-2 rounded-md bg-green px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-green-hover"
                  >
                    Sign in
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/sign-up?callbackUrl=/leadership/apply"
                    className="inline-flex items-center rounded-md border border-green bg-card px-5 py-3 text-sm font-bold text-green transition-colors hover:bg-mint"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            ) : underReview ? (
              <div role="status" className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-card p-6 shadow-sm md:p-8">
                <span className="flex size-11 items-center justify-center rounded-full bg-gold-tint text-gold">
                  <Clock className="size-5" aria-hidden="true" />
                </span>
                <h2 className="font-serif text-2xl font-semibold text-heading">
                  Your application is {STATUS_LABELS[existing.status].toLowerCase()}
                </h2>
                <p className="leading-relaxed text-muted-2">
                  Submitted {existing.submittedAt?.toLocaleDateString("en-GB", { dateStyle: "medium" })}. We will contact
                  you once it has been reviewed.
                </p>
              </div>
            ) : (
              <>
                {existing?.status === "rejected" && existing.reviewNote && (
                  <div className="rounded-xl border border-gold/40 bg-gold-tint p-4 text-sm leading-relaxed text-body">
                    <span className="font-semibold text-heading">Previous application feedback: </span>
                    {existing.reviewNote}
                  </div>
                )}
                <LeadershipApplicationForm defaultEmail={session.user.email ?? ""} defaultName={session.user.name ?? ""} />
              </>
            )}
          </div>

          <ApplySidebar />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

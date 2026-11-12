import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Check, Clock, LogIn } from "lucide-react"
import { getSession } from "@/lib/session"
import { getMyLeadershipApplication } from "@/app/actions/leadership"
import { STATUS_LABELS } from "@/lib/leadership"
import { LeadershipApplicationForm } from "@/components/leadership/application-form"
import { ApplySidebar } from "@/components/leadership/apply-sidebar"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { LeadershipEligibility } from "@/components/leadership/eligibility"
import { getMembershipStanding } from "@/lib/membership-state"

export const metadata: Metadata = {
  title: "Apply for VAAP Leadership",
  description: "Apply to join the VAAP Executive Committee, Advisory Board or Industry Advisors.",
  alternates: { canonical: "/leadership/apply" },
}

export default async function LeadershipApplyPage() {
  const [session, user] = await Promise.all([getSession(), getHeaderUser()])
  const existing = session?.user ? await getMyLeadershipApplication() : null
  const underReview = existing && (existing.status === "pending" || existing.status === "in_review")
  const needsMembership =
    underReview && existing.membershipStatus === "future" && session?.user
      ? (await getMembershipStanding(session.user.id, session.user.email ?? "")).state !== "active"
      : false

  return (
    <>
      <SiteHeaderServer active="About" user={user} />
      <main className="bg-background">
        <section className="bg-navy-dark text-primary-foreground">
          <div className="vaap-container flex flex-col gap-4 py-6 md:py-8">
            <nav aria-label="Breadcrumb" className="text-xs text-primary-foreground/60">
              <ol className="flex items-center gap-2">
                <li>
                  <Link href="/about#leadership" className="transition-colors hover:text-primary-foreground">
                    Leadership
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="font-medium text-primary-foreground">
                  Apply
                </li>
              </ol>
            </nav>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <div className="flex flex-col gap-2">
                <h1 className="font-serif text-2xl font-bold leading-tight text-balance md:text-3xl">
                  Apply to serve on VAAP leadership
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-primary-foreground/75 text-pretty">
                  Help shape Pakistan&apos;s virtual asset industry. Every application is reviewed by the VAAP team, and
                  no profile is published until it has been approved.
                </p>
              </div>
              <dl className="flex flex-wrap gap-x-8 gap-y-3 lg:shrink-0 lg:border-l lg:border-primary-foreground/15 lg:pl-8">
                {[
                  ["Positions", "Executive & Advisory"],
                  ["Commitment", "5+ hrs / month"],
                  ["Membership", "Required"],
                ].map(([term, detail]) => (
                  <div key={term} className="flex flex-col gap-0.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/55">
                      {term}
                    </dt>
                    <dd className="text-sm font-medium">{detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <div className="vaap-container grid gap-8 py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
          <div className="flex min-w-0 flex-col gap-6">
            <LeadershipEligibility />
            {!session?.user ? (
              <div className="grid overflow-hidden rounded-xl border border-line bg-card md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="flex flex-col items-start gap-5 px-6 py-6 md:px-8 md:py-7">
                <div className="flex flex-col gap-2">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-green">
                    <LogIn className="size-4" aria-hidden="true" />
                    Account required
                  </p>
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
                <div className="flex flex-col gap-3 border-t border-line bg-surface px-6 py-6 md:border-l md:border-t-0">
                  <p className="text-sm font-semibold text-heading">Have these ready</p>
                  <ul className="flex flex-col gap-2.5 text-sm leading-relaxed text-body">
                    {["Professional biography", "Profile photograph", "Current title & organization", "LinkedIn or website link"].map(
                      (item) => (
                        <li key={item} className="flex items-start gap-2">
                          <Check className="mt-1 size-3.5 shrink-0 text-green" aria-hidden="true" />
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
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
                {needsMembership && (
                  <div className="flex w-full flex-col gap-3 rounded-xl border border-line-light bg-mint-2 p-4 text-sm leading-relaxed text-body">
                    <p>
                      <span className="font-semibold text-heading">Membership required for appointment. </span>
                      If the VAAP team conditionally accepts your application, complete your VAAP membership registration
                      and billing. Your appointment is finalised once your membership is verified.
                    </p>
                    <Link
                      href="/membership/apply"
                      className="group inline-flex w-fit items-center gap-2 rounded-md bg-green px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-green-hover"
                    >
                      Register for membership
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </div>
                )}
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

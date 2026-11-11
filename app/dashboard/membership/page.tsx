import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Check, Download, Lock } from "lucide-react"
import { getMembershipStanding, MEMBERSHIP_STATE_LABEL, type MembershipState } from "@/lib/membership-state"
import { getSession } from "@/lib/session"
import { getMyMembership, getMembershipPlans } from "@/app/actions/cms"
import { PageHeading } from "@/components/member/page-heading"
import { MembershipCard } from "@/components/member/membership-card"
import { RenewButton } from "@/components/member/renew-button"
import { UpgradeButton, ApplyButton } from "@/components/member/membership-actions"
import { effectiveExpiry } from "@/lib/membership"

const STEPS = ["Apply for membership", "Complete payment", "Staff review", "Membership active"]

const STATE_NOTICE: Record<
  MembershipState,
  { title: string; body: string; step: number; badge: string; cta?: { label: string; href: string } }
> = {
  "not-member": {
    title: "No membership yet",
    body: "You have not applied for or purchased a VAAP membership yet. Apply for paid membership to access exclusive member benefits.",
    step: 0,
    badge: "bg-surface text-body",
    cta: { label: "Apply for Paid Membership", href: "/membership/apply" },
  },
  "payment-pending": {
    title: "Your payment is not confirmed yet",
    body: "We received your application but have not confirmed your payment. Complete your payment to send it for review.",
    step: 1,
    badge: "bg-amber-100 text-amber-700",
    cta: { label: "Complete Payment", href: "/membership/apply" },
  },
  "under-review": {
    title: "Your application is under review",
    body: "Payment received. VAAP staff are reviewing your application. Your Member ID is issued once it is approved.",
    step: 2,
    badge: "bg-amber-100 text-amber-700",
  },
  active: { title: "Active Paid Member", body: "", step: 4, badge: "bg-mint text-green" },
  expired: {
    title: "Your membership has expired",
    body: "Renew your membership to restore your benefits, voting eligibility, and event publishing.",
    step: 0,
    badge: "bg-red-100 text-red-700",
    cta: { label: "Renew Membership", href: "/membership/apply" },
  },
  suspended: {
    title: "Your membership is suspended",
    body: "Your membership is not in good standing. Contact VAAP staff through Messages to resolve this.",
    step: 2,
    badge: "bg-red-100 text-red-700",
    cta: { label: "Contact VAAP", href: "/dashboard/messages" },
  },
  rejected: {
    title: "Your application was not approved",
    body: "You can review your details and submit a new application.",
    step: 0,
    badge: "bg-red-100 text-red-700",
    cta: { label: "Apply Again", href: "/membership/apply" },
  },
}

function fmt(d: Date | string | null | undefined) {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"
}

export default async function MembershipPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const user = session.user
  // Claims an email-only member row for this account before resolving standing.
  await getMyMembership(user.id)
  const [standing, planRows] = await Promise.all([
    getMembershipStanding(user.id, user.email),
    getMembershipPlans(),
  ])
  const applyPlans = planRows.map((p) => ({ id: p.id, title: p.title }))
  const membership = standing.member
  const isActive = standing.state === "active"
  const activeMembership = isActive ? membership : null
  const canApply = standing.state === "not-member" || standing.state === "rejected" || standing.state === "expired"
  const appliedCategory =
    standing.application && (standing.state === "payment-pending" || standing.state === "under-review")
      ? `${standing.application.category} (applied)`
      : null
  const notice = STATE_NOTICE[standing.state]

  return (
    <div className="w-full">
      <PageHeading title="Membership" description="Your VAAP membership details, digital card, and renewal." />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {activeMembership ? (
        <MembershipCard
          membership={
            activeMembership
              ? {
                  membershipId: activeMembership.membershipId,
                  name: activeMembership.name,
                  category: activeMembership.category,
                  organization: activeMembership.organization,
                  goodStanding: activeMembership.goodStanding,
                  votingEligible: activeMembership.votingEligible,
                  joinedAt: activeMembership.joinedAt.toISOString(),
                  expiresAt: activeMembership.expiresAt ? activeMembership.expiresAt.toISOString() : null,
                }
              : null
          }
          memberName={user.name ?? "Member"}
        />
        ) : (
          <section
            aria-labelledby="membership-status-heading"
            className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-6"
          >
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${notice.badge}`}>
              {MEMBERSHIP_STATE_LABEL[standing.state]}
            </span>
            <div>
              <h2 id="membership-status-heading" className="text-balance text-lg font-bold text-heading">
                {notice.title}
              </h2>
              <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-2">{notice.body}</p>
            </div>
            <ol className="flex flex-col gap-3 border-t border-line pt-4 text-sm">
              {STEPS.map((step, i) => {
                const done = i < notice.step
                const current = i === notice.step
                return (
                  <li key={step} className="flex items-center gap-3">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        done ? "bg-green text-white" : current ? "bg-mint text-green ring-1 ring-green-border" : "bg-surface text-muted-2"
                      }`}
                      aria-hidden="true"
                    >
                      {done ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    <span className={done || current ? "font-semibold text-heading" : "text-muted-2"}>{step}</span>
                    {done && <span className="sr-only">(completed)</span>}
                    {current && <span className="sr-only">(current step)</span>}
                  </li>
                )
              })}
            </ol>
            {notice.cta && (
              <Link
                href={notice.cta.href}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-green px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green/90"
              >
                {notice.cta.label} <ArrowRight className="size-4" />
              </Link>
            )}
          </section>
        )}

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="text-base font-bold text-heading">Membership details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Member ID" value={membership?.membershipId ?? "Not Assigned"} />
              <Detail
                label="Category"
                value={
                  membership?.category ??
                  appliedCategory ??
                  (standing.state === "not-member" ? "Not Applied" : "Not Assigned")
                }
              />
              <Detail label="Status" value={MEMBERSHIP_STATE_LABEL[standing.state]} />
              <Detail label="Member since" value={membership ? fmt(membership.joinedAt) : "—"} />
              <Detail
                label="Valid till"
                value={membership ? fmt(effectiveExpiry(membership.joinedAt, membership.expiresAt)) : "—"}
              />
              <Detail label="Membership term" value={membership ? "1 year (365 days)" : "Not Started"} />
            </dl>
          </div>

          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="text-base font-bold text-heading">Certificate</h2>
            {activeMembership ? (
              <>
                <p className="mt-1 text-sm text-muted-2">
                  Download your official membership certificate as proof of your VAAP standing.
                </p>
                <a
                  href={`/api/certificate?id=${activeMembership.membershipId}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-green-border bg-mint px-5 py-2.5 text-sm font-semibold text-green transition-colors hover:bg-green hover:text-white"
                >
                  <Download className="size-4" /> Download certificate
                </a>
              </>
            ) : (
              <p className="mt-1 flex items-start gap-2 text-sm leading-relaxed text-muted-2">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Your certificate becomes available once your paid membership is approved and active.
              </p>
            )}
          </div>

          {isActive ? (
            <>
              <div className="rounded-2xl border border-line bg-card p-6">
                <h2 className="text-base font-bold text-heading">Upgrade membership</h2>
                <p className="mb-4 mt-1 text-sm text-muted-2">
                  Move to a higher membership tier. Submit a request and our team will review your eligibility.
                </p>
                <UpgradeButton currentCategory={membership?.category} />
              </div>

              <div className="rounded-2xl border border-line bg-card p-6">
                <h2 className="text-base font-bold text-heading">Renew membership</h2>
                <p className="mb-4 mt-1 text-sm text-muted-2">
                  Keep your benefits active. Submit a renewal request and our team will confirm your new term.
                </p>
                <RenewButton />
              </div>
            </>
          ) : canApply ? (
            <div className="rounded-2xl border border-line bg-card p-6">
              <h2 className="text-base font-bold text-heading">
                {standing.state === "expired" ? "Renew your membership" : "Become a paid member"}
              </h2>
              <p className="mb-4 mt-1 text-sm text-muted-2">
                Paid VAAP members unlock voting eligibility, a digital membership card, an official certificate, and
                event publishing. Choose a category to apply.
              </p>
              <ApplyButton plans={applyPlans} />
              <a
                href="/membership/apply"
                className="mt-3 inline-flex w-fit items-center text-sm font-medium text-green underline underline-offset-4 hover:text-green-hover"
              >
                Or fill out the full application form →
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-2">{label}</dt>
      <dd className="mt-0.5 font-semibold capitalize text-heading">{value}</dd>
    </div>
  )
}

import { redirect } from "next/navigation"
import { Download } from "lucide-react"
import { getSession } from "@/lib/session"
import { getMyMembership, getMembershipPlans } from "@/app/actions/cms"
import { PageHeading } from "@/components/member/page-heading"
import { MembershipCard } from "@/components/member/membership-card"
import { RenewButton } from "@/components/member/renew-button"
import { UpgradeButton, ApplyButton } from "@/components/member/membership-actions"
import { effectiveExpiry } from "@/lib/membership"

function fmt(d: Date | string | null | undefined) {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"
}

export default async function MembershipPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const user = session.user
  const [membership, planRows] = await Promise.all([getMyMembership(user.id), getMembershipPlans()])
  const applyPlans = planRows.map((p) => ({ id: p.id, title: p.title }))
  // Only an approved, active record counts as a real membership. A self-created
  // "pending" profile row (from editing the profile before approval) does not.
  const isActive = membership?.status === "active"
  const activeMembership = isActive ? membership : null

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeading title="Membership" description="Your VAAP membership details, digital card, and renewal." />

      <div className="grid gap-6 lg:grid-cols-2">
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

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="text-base font-bold text-heading">Membership details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Category" value={membership?.category ?? "Under review"} />
              <Detail label="Status" value={membership?.status ?? "Pending"} />
              <Detail label="Member since" value={fmt(membership?.joinedAt)} />
              <Detail
                label="Valid till"
                value={fmt(effectiveExpiry(membership?.joinedAt, membership?.expiresAt))}
              />
              <Detail label="Term" value="1 year (365 days)" />
            </dl>
          </div>

          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="text-base font-bold text-heading">Certificate</h2>
            <p className="mt-1 text-sm text-muted-2">
              Download your official membership certificate as proof of your VAAP standing.
            </p>
            <a
              href={activeMembership ? `/api/certificate?id=${activeMembership.membershipId}` : "#"}
              className={`mt-4 inline-flex items-center gap-2 rounded-lg border border-green-border bg-mint px-5 py-2.5 text-sm font-semibold text-green transition-colors hover:bg-green hover:text-white ${
                activeMembership ? "" : "pointer-events-none opacity-50"
              }`}
            >
              <Download className="size-4" /> Download certificate
            </a>
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
          ) : (
            <div className="rounded-2xl border border-line bg-card p-6">
              <h2 className="text-base font-bold text-heading">Apply for membership</h2>
              <p className="mb-4 mt-1 text-sm text-muted-2">
                {membership
                  ? "Your details are saved. Choose a category and submit your application to be reviewed and issued an official VAAP membership ID."
                  : "Become a verified VAAP member to unlock voting, your digital membership card, and an official certificate. Choose a category to apply."}
              </p>
              <ApplyButton plans={applyPlans} />
              <a
                href="/membership/apply"
                className="mt-3 inline-flex w-fit items-center text-sm font-medium text-green underline underline-offset-4 hover:text-green-hover"
              >
                Or fill out the full application form →
              </a>
            </div>
          )}
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

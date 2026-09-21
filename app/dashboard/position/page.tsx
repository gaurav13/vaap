import { Award, Building2, IdCard, ShieldCheck, Coins } from "lucide-react"
import { getMyPosition } from "@/app/actions/member"
import { getSession } from "@/lib/session"
import { isElevated } from "@/lib/permissions"

function money(amount: number, currency = "PKR") {
  return `${currency} ${amount.toLocaleString("en-US")}`
}

function roleLabel(role: string) {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export default async function PositionPage() {
  const session = await getSession()
  const sessionRole = session?.user?.role ?? "member"

  if (!isElevated(sessionRole)) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-mint">
            <Award className="size-6 text-green" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-heading">My Position in VAAP</h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-body">
            Position details are available to VAAP staff and committee members. If you believe you should have access,
            please contact the secretariat through the Support page.
          </p>
        </div>
      </div>
    )
  }

  const data = await getMyPosition()

  if (!data) {
    return (
      <div>
        <h1 className="font-serif text-2xl font-bold text-heading">My Position</h1>
        <p className="mt-1 text-muted-2">We could not load your position details. Please sign in again.</p>
      </div>
    )
  }

  const { role, staff, membership, rewards } = data

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl font-bold text-heading">My Position in VAAP</h1>
      <p className="mt-1 text-muted-2">Your role, appointments, and standing within the association.</p>

      {/* Role banner */}
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-navy px-6 py-5 text-white">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Award className="size-6 text-green-light" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Current role</p>
          <p className="text-xl font-bold">{roleLabel(role)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Staff / committee position */}
        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center gap-2 text-heading">
            <Building2 className="size-5 text-green" />
            <h2 className="font-serif text-lg font-bold">Appointment</h2>
          </div>
          {staff ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">Position</dt>
                <dd className="mt-0.5 font-medium text-heading">{staff.position || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">Committee</dt>
                <dd className="mt-0.5 font-medium text-heading">
                  {staff.committeeNames.length > 0 ? staff.committeeNames.join(", ") : "—"}
                  {staff.isCommitteeHead && (
                    <span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-xs font-semibold text-navy">Head</span>
                  )}
                </dd>
              </div>
              {staff.bio && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">Bio</dt>
                  <dd className="mt-0.5 leading-relaxed text-body">{staff.bio}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-2">
              You do not hold a staff or committee appointment. If this is unexpected, contact the administration.
            </p>
          )}
        </section>

        {/* Membership standing */}
        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-center gap-2 text-heading">
            <IdCard className="size-5 text-green" />
            <h2 className="font-serif text-lg font-bold">Membership</h2>
          </div>
          {membership ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">Category</dt>
                <dd className="mt-0.5 font-medium text-heading">{membership.category}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">Membership ID</dt>
                <dd className="mt-0.5 font-mono text-heading">{membership.membershipId}</dd>
              </div>
              {membership.designation && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">Designation</dt>
                  <dd className="mt-0.5 font-medium text-heading">
                    {membership.designation}
                    {membership.organization ? ` · ${membership.organization}` : ""}
                  </dd>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <ShieldCheck className={membership.votingEligible ? "size-4 text-green" : "size-4 text-muted-2"} />
                <span className="text-sm text-body">
                  {membership.votingEligible ? "Voting eligible" : "Not voting eligible"}
                </span>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-2">No active membership record is linked to your account.</p>
          )}
        </section>
      </div>

      {/* Rewards summary — only for approved staff / committee members */}
      {staff && (
      <section className="mt-4 rounded-2xl border border-line bg-card p-6">
        <div className="flex items-center gap-2 text-heading">
          <Coins className="size-5 text-green" />
          <h2 className="font-serif text-lg font-bold">Referral rewards</h2>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold text-heading">{money(rewards.total)}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">Total earned</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green">{money(rewards.paid)}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">Paid out</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-heading">{rewards.count}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">Rewards</p>
          </div>
        </div>
      </section>
      )}
    </div>
  )
}

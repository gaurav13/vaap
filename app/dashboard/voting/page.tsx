import { redirect } from "next/navigation"
import Link from "next/link"
import { Check, ShieldCheck, X, FileCheck2, Boxes, Coins, Clock } from "lucide-react"
import { getSession } from "@/lib/session"
import { getMyMembership } from "@/app/actions/cms"
import { PageHeading } from "@/components/member/page-heading"
import { VoteRegisterButton } from "@/components/member/vote-register-button"

const ELIGIBLE_ASSET_TYPES = ["ntn", "blockchain", "virtual-asset"]

export default async function VotingPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const user = session.user
  const membership = await getMyMembership(user.id)

  const eligible = membership?.votingEligible ?? false
  const active = membership?.status === "active"
  const goodStanding = membership?.goodStanding ?? false
  const assetType = membership?.assetType ?? ""
  const qualifyingCategory = ELIGIBLE_ASSET_TYPES.includes(assetType)
  const requested = membership?.voteRequested ?? false

  const criteria = [
    { label: "Active membership", met: active },
    { label: "Good standing (dues cleared)", met: goodStanding },
    { label: "NTN holder or blockchain / virtual-asset industry member", met: qualifyingCategory },
    { label: "Approved for voting eligibility", met: eligible },
  ]

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeading title="Voting Status" description="Your eligibility to vote in VAAP elections and resolutions." />

      <div
        className={`flex items-center gap-4 rounded-2xl border p-6 ${
          eligible ? "border-green-border bg-mint" : "border-line bg-card"
        }`}
      >
        <span
          className={`flex size-14 shrink-0 items-center justify-center rounded-full ${
            eligible ? "bg-green text-white" : "bg-muted text-muted-2"
          }`}
        >
          <ShieldCheck className="size-7" />
        </span>
        <div>
          <p className="text-sm text-muted-2">Current status</p>
          <p className={`text-xl font-bold ${eligible ? "text-green" : "text-heading"}`}>
            {eligible
              ? "Eligible to vote"
              : requested
                ? "Registration under review"
                : "Not currently registered"}
          </p>
        </div>
      </div>

      {/* Who can vote */}
      <div className="mt-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="text-base font-bold text-heading">Who can register to vote</h2>
        <p className="mb-4 mt-1 text-sm text-muted-2">
          Voting rights in VAAP are reserved for members with a verified stake in Pakistan&apos;s virtual asset industry.
          You may register to vote if you fall into one of the following categories:
        </p>
        <ul className="grid gap-3 sm:grid-cols-3">
          <WhoCard icon={<FileCheck2 className="size-5" />} title="NTN holders" desc="Registered taxpayers with a valid National Tax Number." />
          <WhoCard icon={<Boxes className="size-5" />} title="Blockchain professionals" desc="Individuals and firms building blockchain technology." />
          <WhoCard icon={<Coins className="size-5" />} title="Virtual asset members" desc="VASPs, exchanges, and virtual-asset investors." />
        </ul>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="text-base font-bold text-heading">Eligibility criteria</h2>
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {criteria.map((c) => (
            <li key={c.label} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm text-heading">{c.label}</span>
              <span
                className={`flex size-6 items-center justify-center rounded-full ${
                  c.met ? "bg-green/15 text-green" : "bg-destructive/10 text-destructive"
                }`}
              >
                {c.met ? <Check className="size-4" /> : <X className="size-4" />}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Registration action */}
      {!eligible && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <h2 className="text-base font-bold text-heading">Register to vote</h2>
          {requested ? (
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-green">
              <Clock className="size-4" /> Your registration has been submitted and is awaiting governance review.
            </p>
          ) : !qualifyingCategory ? (
            <>
              <p className="mb-4 mt-1 text-sm text-muted-2">
                Voting registration is limited to NTN holders and blockchain / virtual-asset industry members. Add a
                qualifying industry category (and your NTN, if applicable) to your profile to unlock registration.
              </p>
              <Link
                href="/dashboard/profile"
                className="inline-flex items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
              >
                Update my profile
              </Link>
            </>
          ) : !active || !goodStanding ? (
            <p className="mb-1 mt-1 text-sm text-muted-2">
              Your membership must be active and in good standing before you can register. Please clear any outstanding
              dues or contact support.
            </p>
          ) : (
            <>
              <p className="mb-4 mt-1 text-sm text-muted-2">
                You meet the industry requirements. Submit your voting registration for governance review ahead of the
                next election cycle.
              </p>
              <VoteRegisterButton />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function WhoCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="rounded-xl border border-line bg-background p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-mint text-green">{icon}</span>
      <p className="mt-3 text-sm font-bold text-heading">{title}</p>
      <p className="mt-1 text-xs text-muted-2">{desc}</p>
    </li>
  )
}

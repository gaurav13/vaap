import { BadgeCheck, ShieldCheck, Vote } from "lucide-react"
import { VaapLogo } from "@/components/vaap-logo"
import { effectiveExpiry } from "@/lib/membership"

type Membership = {
  membershipId: string
  name: string
  category: string
  organization?: string | null
  goodStanding: boolean
  votingEligible: boolean
  joinedAt: string
  expiresAt?: string | null
}

export function MembershipCard({ membership, memberName }: { membership: Membership | null; memberName: string }) {
  if (!membership) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-6">
        <p className="text-sm font-bold text-heading">No membership record linked yet</p>
        <p className="mt-1 text-sm text-muted-2">
          Your account is active. A formal membership ID is issued once your application is approved by VAAP staff.
        </p>
      </div>
    )
  }

  const joined = new Date(membership.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
  const expiry = effectiveExpiry(membership.joinedAt, membership.expiresAt)
  const validTill = expiry ? expiry.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"

  return (
    <div className="overflow-hidden rounded-2xl border border-navy/20 bg-navy text-white shadow-[0_24px_60px_-30px_rgba(11,31,42,0.8)]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
        <VaapLogo height={34} onDark />
        <span className="rounded-full bg-green px-3 py-1 text-xs font-bold uppercase tracking-wide">
          {membership.category}
        </span>
      </div>
      <div className="px-6 py-6">
        <p className="text-xs uppercase tracking-wider text-white/50">Member</p>
        <p className="mt-1 font-serif text-2xl font-bold">{membership.name || memberName}</p>
        {membership.organization && <p className="text-sm text-white/70">{membership.organization}</p>}

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Membership ID</p>
            <p className="mt-1 font-mono text-sm font-semibold">{membership.membershipId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Member since</p>
            <p className="mt-1 text-sm font-semibold">{joined}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Valid till</p>
            <p className="mt-1 text-sm font-semibold">{validTill}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/50">Term</p>
            <p className="mt-1 text-sm font-semibold">1 year (365 days)</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Flag on={membership.goodStanding} icon={ShieldCheck} label="Good standing" />
          <Flag on={membership.votingEligible} icon={Vote} label="Voting eligible" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            <BadgeCheck className="size-3.5 text-green-light" /> Verified member
          </span>
        </div>
      </div>
    </div>
  )
}

function Flag({ on, icon: Icon, label }: { on: boolean; icon: typeof ShieldCheck; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        on ? "bg-green/25 text-green-light" : "bg-white/10 text-white/50 line-through"
      }`}
    >
      <Icon className="size-3.5" /> {label}
    </span>
  )
}

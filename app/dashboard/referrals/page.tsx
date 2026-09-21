import { getSession } from "@/lib/session"
import { getMyReferralDashboard, getOrCreateMyReferralCode } from "@/app/actions/referrals"
import { canOwnReferralCode } from "@/lib/permissions"
import { ReferralDashboard } from "@/components/member/referral-dashboard"
import { Share2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ReferralsPage() {
  const session = await getSession()
  const role = session?.user?.role ?? "member"
  const eligible = canOwnReferralCode(role)

  if (!eligible) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-mint">
            <Share2 className="size-6 text-green" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-heading">Referrals &amp; Rewards</h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-body">
            Referral codes and commission rewards are available to VAAP staff, committee members, and approved
            partners. If you believe you should have access, please contact the secretariat through the Support page.
          </p>
        </div>
      </div>
    )
  }

  // Ensure the caller has a code, then load their dashboard data.
  await getOrCreateMyReferralCode()
  const data = await getMyReferralDashboard()

  return <ReferralDashboard data={data} />
}

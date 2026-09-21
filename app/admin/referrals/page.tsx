import { getReferralConsole } from "@/app/actions/admin-referrals"
import { ReferralConsole } from "@/components/admin/referral-console"

export const dynamic = "force-dynamic"

export default async function AdminReferralsPage() {
  const data = await getReferralConsole()
  return <ReferralConsole data={data} />
}

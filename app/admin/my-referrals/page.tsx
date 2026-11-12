import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { canOwnReferralCode, isAdminAreaRole } from "@/lib/permissions"
import { getMyReferralPerformance } from "@/app/actions/referrals"
import { MyReferralPerformanceView } from "@/components/admin/my-referral-performance"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "My Referral Performance | VAAP Admin",
}

export default async function MyReferralsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const role = session.user.role
  if (!isAdminAreaRole(role) || !canOwnReferralCode(role)) redirect("/admin")

  const data = await getMyReferralPerformance()
  return <MyReferralPerformanceView data={data} readOnly={role === "staff"} />
}

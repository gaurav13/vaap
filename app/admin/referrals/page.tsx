import { redirect } from "next/navigation"
import { getReferralConsole } from "@/app/actions/admin-referrals"
import { ReferralConsole } from "@/components/admin/referral-console"
import { getSession, isAdmin } from "@/lib/session"
import { appBaseUrl } from "@/lib/email-templates/service"

export const dynamic = "force-dynamic"

export default async function AdminReferralsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  const readOnly = !isAdmin(session.user.role)

  const data = await getReferralConsole()
  const safeData = readOnly
    ? { ...data, recentAttributions: data.recentAttributions.map((a) => ({ ...a, memberEmail: "Hidden" })) }
    : data

  return <ReferralConsole data={safeData} readOnly={readOnly} baseUrl={appBaseUrl()} />
}

import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { MemberShell } from "@/components/member/member-shell"
import { getMyNotifications } from "@/app/actions/referrals"
import type { NotificationItem } from "@/components/member/notification-bell"
import { canOwnReferralCode } from "@/lib/permissions"
import { isVerifiedKolUser } from "@/lib/kol"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const u = session.user
  let notifications: NotificationItem[] = []
  try {
    notifications = (await getMyNotifications()) as unknown as NotificationItem[]
  } catch {
    notifications = []
  }

  const referralAccess = canOwnReferralCode(u.role) || (await isVerifiedKolUser(u.id).catch(() => false))

  return (
    <MemberShell
      user={{ name: u.name ?? "Member", email: u.email, role: u.role }}
      notifications={notifications}
      referralAccess={referralAccess}
    >
      {children}
    </MemberShell>
  )
}

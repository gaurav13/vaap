import type React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AdminNav } from "@/components/admin/admin-nav"
import { AdminTopbar } from "@/components/admin/admin-topbar"
import { headers } from "next/headers"
import { isStaffAdminRoute } from "@/lib/permissions"
import { getMyNotifications } from "@/app/actions/referrals"
import type { NotificationItem } from "@/components/member/notification-bell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const role = session.user.role
  if (role !== "staff" && role !== "admin") redirect("/dashboard")

  // Staff are read-only and limited to members, articles and referrals.
  if (role === "staff") {
    const pathname = (await headers()).get("x-pathname") ?? ""
    if (!isStaffAdminRoute(pathname)) redirect("/admin/members")
  }

  let notifications: NotificationItem[] = []
  try {
    notifications = (await getMyNotifications("admin")) as unknown as NotificationItem[]
  } catch {
    notifications = []
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 lg:flex-row">
      <AdminNav role={role as "staff" | "admin"} name={session.user.name ?? "Admin"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar role={role as "staff" | "admin"} name={session.user.name ?? "Admin"} notifications={notifications} />
        <main className="flex-1 px-5 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  )
}

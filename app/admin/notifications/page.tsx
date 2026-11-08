import { getMyNotifications } from "@/app/actions/referrals"
import { NotificationsList } from "@/components/member/notifications-list"
import type { NotificationItem } from "@/components/member/notification-bell"

export const metadata = {
  title: "Admin Notifications | VAAP",
  description: "Registrations, membership status, and payment activity across VAAP.",
}

export default async function AdminNotificationsPage() {
  let notifications: NotificationItem[] = []
  try {
    notifications = (await getMyNotifications("admin")) as unknown as NotificationItem[]
  } catch {
    notifications = []
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Admin notifications</h1>
        <p className="mt-1 text-sm text-muted-2">
          New registrations, membership status changes, and payments received, pending, or failed. Visible to admins only.
        </p>
      </div>
      <NotificationsList initial={notifications} scope="admin" />
    </div>
  )
}

import { getMyNotifications } from "@/app/actions/referrals"
import { NotificationsList } from "@/components/member/notifications-list"
import type { NotificationItem } from "@/components/member/notification-bell"

export const metadata = {
  title: "Notifications | VAAP",
  description: "Your VAAP account activity, membership updates, and rewards.",
}

export default async function NotificationsPage() {
  let notifications: NotificationItem[] = []
  try {
    notifications = (await getMyNotifications()) as unknown as NotificationItem[]
  } catch {
    notifications = []
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Notifications</h1>
        <p className="mt-1 text-sm text-muted-2">
          Account activity, membership updates, rewards, and security alerts.
        </p>
      </div>
      <NotificationsList initial={notifications} />
    </div>
  )
}

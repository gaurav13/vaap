import { redirect } from "next/navigation"
import { and, eq, gte, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { emailLogs } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { getAdminAlertConfig } from "@/lib/admin-alerts"
import { ADMIN_ALERTS } from "@/lib/admin-alerts-shared"
import { EmailTabs } from "@/components/admin/email-tabs"
import { AdminAlertSettings } from "@/components/admin/admin-alert-settings"

export const metadata = { title: "Admin Notifications | VAAP Admin" }

async function loadStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  try {
    return await db
      .select({
        key: emailLogs.templateKey,
        sent: sql<number>`count(*) filter (where ${emailLogs.status} = 'sent')`,
        failed: sql<number>`count(*) filter (where ${emailLogs.status} = 'failed')`,
      })
      .from(emailLogs)
      .where(
        and(
          gte(emailLogs.createdAt, since),
          eq(emailLogs.isTest, false),
          inArray(
            emailLogs.templateKey,
            ADMIN_ALERTS.map((a) => a.templateKey),
          ),
        ),
      )
      .groupBy(emailLogs.templateKey)
  } catch {
    return []
  }
}

export default async function AdminNotificationsPage() {
  const session = await getSession()
  if (session?.user?.role !== "admin") redirect("/admin")

  const [config, stats] = await Promise.all([getAdminAlertConfig(), loadStats()])
  const statsByKey = Object.fromEntries(stats.map((s) => [s.key, { sent: Number(s.sent), failed: Number(s.failed) }]))

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Email Templates</h1>
      <p className="mt-1 max-w-2xl text-pretty leading-relaxed text-muted-2">
        Every automated email the website sends. Edits are saved as drafts and only reach members after you publish.
      </p>

      <EmailTabs active="notifications" />

      <AdminAlertSettings
        initialRecipients={config.recipients.join(", ")}
        initialEnabled={config.enabled}
        stats={statsByKey}
      />
    </div>
  )
}

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auditLogs, settings } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { getAdminAlertConfig, parseRecipients } from "@/lib/admin-alerts"
import { sendTemplateEmail } from "@/lib/email-templates/service"
import { getTemplateDefinition, sampleVars } from "@/lib/email-templates/registry"
import {
  ADMIN_ALERTS,
  ADMIN_ALERTS_SETTINGS_KEY,
  MAX_ALERT_RECIPIENTS,
  isAdminAlertType,
  type AdminAlertConfig,
} from "@/lib/admin-alerts-shared"

type Result = { ok: true; message?: string } | { ok: false; error: string }

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin") throw new Error("Forbidden")
  return session.user
}

export async function saveAdminAlertSettings(input: { recipients: string; enabled: Record<string, boolean> }): Promise<Result> {
  try {
    const me = await requireAdmin()
    const requested = String(input.recipients ?? "")
      .split(/[,;\s]+/)
      .filter(Boolean)
    const recipients = parseRecipients(requested)
    if (recipients.length === 0) return { ok: false, error: "Add at least one valid recipient email address." }
    if (requested.length > MAX_ALERT_RECIPIENTS) {
      return { ok: false, error: `You can add up to ${MAX_ALERT_RECIPIENTS} recipients.` }
    }
    if (recipients.length !== new Set(requested.map((e) => e.toLowerCase())).size) {
      return { ok: false, error: "One or more recipient addresses aren't valid." }
    }

    const enabled = Object.fromEntries(
      ADMIN_ALERTS.map((a) => [a.type, input.enabled?.[a.type] !== false]),
    ) as AdminAlertConfig["enabled"]
    const value = JSON.stringify({ recipients, enabled } satisfies AdminAlertConfig)

    await db
      .insert(settings)
      .values({ key: ADMIN_ALERTS_SETTINGS_KEY, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
    try {
      await db.insert(auditLogs).values({
        actorId: me.id,
        actorName: me.name ?? "",
        action: "email.admin_alerts.update",
        target: recipients.join(", "),
      })
    } catch {
      // audit failures must never block the primary write
    }
    revalidatePath("/admin/emails/notifications")
    return { ok: true, message: "Notification settings saved." }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save settings." }
  }
}

export async function sendAdminAlertTest(type: string): Promise<Result> {
  try {
    await requireAdmin()
    if (!isAdminAlertType(type)) return { ok: false, error: "Unknown notification type." }
    const def = ADMIN_ALERTS.find((a) => a.type === type)!
    const template = getTemplateDefinition(def.templateKey)
    if (!template) return { ok: false, error: "Template not found." }
    const config = await getAdminAlertConfig()
    const vars = sampleVars(template)
    const results = await Promise.all(config.recipients.map((to) => sendTemplateEmail({ to, key: def.templateKey, vars })))
    if (results.every(Boolean)) return { ok: true, message: `Test sent to ${config.recipients.join(", ")}.` }
    return { ok: false, error: "The test email could not be delivered. Check Email Logs for details." }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not send test email." }
  }
}

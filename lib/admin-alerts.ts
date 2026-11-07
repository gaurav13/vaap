import "server-only"

import { after } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { CONTACT_EMAIL } from "@/lib/contact"
import { sendTemplateEmail } from "@/lib/email-templates/service"
import {
  ADMIN_ALERTS,
  ADMIN_ALERTS_SETTINGS_KEY,
  MAX_ALERT_RECIPIENTS,
  SENSITIVE_REPORT_CATEGORIES,
  type AdminAlertConfig,
  type AdminAlertType,
} from "@/lib/admin-alerts-shared"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function defaultAdminAlertConfig(): AdminAlertConfig {
  return {
    recipients: [CONTACT_EMAIL],
    enabled: Object.fromEntries(ADMIN_ALERTS.map((a) => [a.type, true])) as AdminAlertConfig["enabled"],
  }
}

export function parseRecipients(raw: unknown): string[] {
  const list = (Array.isArray(raw) ? raw : String(raw ?? "").split(/[,;\s]+/))
    .map((e) => String(e).trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set(list)).filter((e) => EMAIL_RE.test(e)).slice(0, MAX_ALERT_RECIPIENTS)
}

export async function getAdminAlertConfig(): Promise<AdminAlertConfig> {
  const fallback = defaultAdminAlertConfig()
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, ADMIN_ALERTS_SETTINGS_KEY)).limit(1)
    if (!row) return fallback
    const parsed = JSON.parse(row.value) as Partial<AdminAlertConfig>
    const recipients = parseRecipients(parsed.recipients)
    return {
      recipients: recipients.length ? recipients : fallback.recipients,
      enabled: { ...fallback.enabled, ...(parsed.enabled ?? {}) },
    }
  } catch {
    return fallback
  }
}

/** Pakistan time, e.g. "08 Nov 2026, 14:32 PKT". */
export function formatAlertDate(date: Date = new Date()) {
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
  return `${s} PKT`
}

export function reportSummary(category: string, description: string) {
  if (SENSITIVE_REPORT_CATEGORIES.includes(category)) {
    return "Withheld for confidentiality. Open the secure report to view details."
  }
  const clean = description.replace(/\s+/g, " ").trim()
  return clean.length > 140 ? `${clean.slice(0, 140).trimEnd()}…` : clean
}

/**
 * Emails the configured admin recipients. Runs after the response is sent so a
 * slow or failing mail server never delays or breaks the user's submission.
 */
export function sendAdminAlert(type: AdminAlertType, vars: Record<string, string | undefined>) {
  const def = ADMIN_ALERTS.find((a) => a.type === type)
  if (!def) return
  const run = async () => {
    try {
      const config = await getAdminAlertConfig()
      if (!config.enabled[type] || config.recipients.length === 0) return
      await Promise.all(config.recipients.map((to) => sendTemplateEmail({ to, key: def.templateKey, vars })))
    } catch (err) {
      console.error(`[admin-alerts] ${type} alert failed:`, err instanceof Error ? err.message : err)
    }
  }
  try {
    after(run)
  } catch {
    void run()
  }
}

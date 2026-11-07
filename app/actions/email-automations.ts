"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { emailAutomations, emailSuppressions, newsletterIssues } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { getAutomation, type AutomationConfig, type AutomationKey } from "@/lib/email-automations/definitions"
import {
  buildNewsletterContent,
  runAutomation,
  sendIndividualReminder,
  sendNewsletterIssue,
  suppress,
} from "@/lib/email-automations/engine"

type Result = { ok: boolean; message: string }
const PATH = "/admin/emails/automations"

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin") throw new Error("Forbidden")
  return session.user
}

function assertKey(key: string): AutomationKey {
  const def = getAutomation(key)
  if (!def) throw new Error("Unknown automation")
  return def.key
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = Number(v)
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback
}

export async function setAutomationEnabled(key: string, enabled: boolean): Promise<Result> {
  const admin = await requireAdmin()
  const k = assertKey(key)
  await db
    .insert(emailAutomations)
    .values({ key: k, enabled, updatedBy: admin.email })
    .onConflictDoUpdate({ target: emailAutomations.key, set: { enabled, updatedBy: admin.email, updatedAt: new Date() } })
  revalidatePath(PATH)
  return { ok: true, message: enabled ? "Automation enabled." : "Automation paused." }
}

export async function saveAutomationConfig(key: string, input: AutomationConfig): Promise<Result> {
  const admin = await requireAdmin()
  const def = getAutomation(assertKey(key))!
  const config: AutomationConfig = {}
  if (def.schedule === "weekly") config.weekday = clampInt(input.weekday, 0, 6, def.defaults.weekday ?? 1)
  if (def.key === "newsletter") config.mode = input.mode === "auto" ? "auto" : "review"
  if (def.key === "verification-reminder") {
    config.intervalDays = clampInt(input.intervalDays, 1, 30, 3)
    config.maxReminders = clampInt(input.maxReminders, 1, 10, 3)
  }
  if (def.key === "incomplete-application") {
    config.followUp3d = Boolean(input.followUp3d)
    config.followUp7d = Boolean(input.followUp7d)
  }
  await db
    .insert(emailAutomations)
    .values({ key: def.key, config, updatedBy: admin.email })
    .onConflictDoUpdate({ target: emailAutomations.key, set: { config, updatedBy: admin.email, updatedAt: new Date() } })
  revalidatePath(PATH)
  return { ok: true, message: "Schedule saved." }
}

export async function runAutomationNow(key: string, eventId?: number): Promise<Result> {
  const admin = await requireAdmin()
  const k = assertKey(key)
  const r = await runAutomation(k, { trigger: "manual", actor: admin.email, eventId })
  revalidatePath(PATH)
  const summary = `Sent ${r.sent}, skipped ${r.skipped}, failed ${r.failed}.`
  return { ok: r.failed === 0, message: r.note ? `${summary} ${r.note}` : summary }
}

export async function sendReminderNow(key: string, refId: string): Promise<Result> {
  const admin = await requireAdmin()
  const k = assertKey(key)
  if (k !== "verification-reminder" && k !== "incomplete-application") throw new Error("Not a reminder automation")
  const r = await sendIndividualReminder(k, refId, admin.email)
  revalidatePath(PATH)
  return r
}

export async function regenerateNewsletter(issueId: number): Promise<Result> {
  const admin = await requireAdmin()
  const [issue] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, issueId)).limit(1)
  if (!issue || issue.status !== "draft") return { ok: false, message: "Only drafts can be regenerated." }
  const content = await buildNewsletterContent(issue.weekKey)
  await db
    .update(newsletterIssues)
    .set({ content, updatedBy: admin.email, updatedAt: new Date() })
    .where(eq(newsletterIssues.id, issueId))
  revalidatePath(PATH)
  return { ok: true, message: "Newsletter rebuilt from this week's content." }
}

export async function approveNewsletter(issueId: number): Promise<Result> {
  const admin = await requireAdmin()
  const r = await sendNewsletterIssue(issueId, "manual", admin.email)
  revalidatePath(PATH)
  return { ok: r.failed === 0 && r.sent > 0, message: `Sent ${r.sent}, skipped ${r.skipped}, failed ${r.failed}. ${r.note}` }
}

export async function addSuppression(email: string): Promise<Result> {
  await requireAdmin()
  const clean = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false, message: "Enter a valid email address." }
  await suppress(clean, "all", "Suppressed by admin", "admin")
  revalidatePath(PATH)
  return { ok: true, message: `${clean} will no longer receive engagement emails.` }
}

export async function removeSuppression(id: number): Promise<Result> {
  await requireAdmin()
  await db.delete(emailSuppressions).where(eq(emailSuppressions.id, id))
  revalidatePath(PATH)
  return { ok: true, message: "Suppression removed." }
}

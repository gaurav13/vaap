import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { emailSends, emailSuppressions, membershipInvitations } from "@/lib/db/schema"
import { sendEmail } from "@/lib/mailer"
import { createToken } from "@/lib/email-tokens"
import { appBaseUrl, getLiveContent, renderWith } from "@/lib/email-templates/service"
import type { EmailTemplateKey } from "@/lib/email-templates/registry"
import { DEFAULT_DAILY_LIMIT, DEFAULT_REMINDER_DAYS, type AutomationConfig } from "@/lib/email-automations/definitions"
import { INVITE_TOPIC, getRegisteredUsers, isInvitable, type RegisteredUser } from "@/lib/membership-funnel"

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
/** Minimum spacing between any two invitation emails to the same person. */
const MIN_GAP = 2 * DAY
/** Manual sends skip anyone emailed in the last 24 hours to prevent duplicates. */
const MANUAL_COOLDOWN = DAY
export const MAX_MANUAL_BATCH = 200

export const STAGES = ["invitation", "reminder-1", "reminder-2", "reminder-final"] as const
export type Stage = (typeof STAGES)[number] | "manual-reminder"
type Outcome = "sent" | "failed" | "skipped"

const TEMPLATE_FOR: Record<Stage, EmailTemplateKey> = {
  invitation: "automation.membership-invitation",
  "reminder-1": "automation.membership-reminder",
  "reminder-2": "automation.membership-reminder",
  "reminder-final": "automation.membership-final-reminder",
  "manual-reminder": "automation.membership-reminder",
}

/** The next stage this person should receive, or a repeatable manual reminder after the final one. */
export function nextStage(u: RegisteredUser): Stage {
  return STAGES.find((s) => !u.sentStages.includes(s)) ?? "manual-reminder"
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there"
}

/** SMTP 5xx rejections for the recipient mean the address is permanently undeliverable. */
function isHardBounce(err: unknown) {
  const code = (err as { responseCode?: number })?.responseCode
  return typeof code === "number" && code >= 550 && code < 560
}

async function record(u: RegisteredUser, stage: Stage, trigger: string, status: Outcome, actor: string | null, error?: string) {
  await db.insert(membershipInvitations).values({
    userId: u.id,
    email: u.email.trim().toLowerCase(),
    stage,
    trigger,
    status,
    actor,
    error: error?.slice(0, 1000) ?? null,
  })
}

async function deliver(u: RegisteredUser, stage: Stage, trigger: string, actor: string | null): Promise<Outcome> {
  const email = u.email.trim().toLowerCase()
  const content = await getLiveContent(TEMPLATE_FOR[stage])
  const unsub = `${appBaseUrl()}/api/email/unsubscribe?token=${encodeURIComponent(
    createToken("unsubscribe", email, { topic: INVITE_TOPIC, ttlDays: 365 }),
  )}`
  const rendered = renderWith(
    content,
    { name: u.name || "Member", firstName: firstName(u.name), url: `${appBaseUrl()}/membership/apply` },
    { unsubscribeUrl: unsub },
  )
  try {
    const ok = await sendEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      templateKey: TEMPLATE_FOR[stage],
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    })
    if (!ok) {
      await record(u, stage, trigger, "failed", actor, "Email delivery is not configured")
      return "failed"
    }
    await record(u, stage, trigger, "sent", actor)
    return "sent"
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (isHardBounce(err)) {
      await db
        .insert(emailSuppressions)
        .values({ email, topic: "all", reason: "bounced", source: "admin" })
        .onConflictDoNothing()
    }
    await record(u, stage, trigger, "failed", actor, message)
    return "failed"
  }
}

export type SendSummary = { sent: number; skipped: number; failed: number; note: string }

/** Admin-initiated invitations. Each person receives their next stage. */
export async function sendManualInvitations(userIds: string[], actor: string, trigger: "manual" | "bulk") {
  const ids = new Set(userIds.slice(0, MAX_MANUAL_BATCH))
  const result: SendSummary = { sent: 0, skipped: 0, failed: 0, note: "" }
  const now = Date.now()
  const targets = (await getRegisteredUsers()).filter((u) => ids.has(u.id))
  result.skipped += ids.size - targets.length // became members, or not found
  for (const u of targets) {
    const recent = u.lastInvitedAt && now - u.lastInvitedAt.getTime() < MANUAL_COOLDOWN
    if (!isInvitable(u) || recent) {
      result.skipped++
      continue
    }
    result[await deliver(u, nextStage(u), trigger, actor)]++
  }
  if (userIds.length > MAX_MANUAL_BATCH) result.note = `Only the first ${MAX_MANUAL_BATCH} were processed.`
  return result
}

function normalizeDays(days: number[] | undefined) {
  const list = (days ?? DEFAULT_REMINDER_DAYS).filter((d) => Number.isInteger(d) && d > 0)
  return list.length === 3 ? [...list].sort((a, b) => a - b) : DEFAULT_REMINDER_DAYS
}

/** Daily automation: first invitation after registration, then reminders on the configured days. */
export async function runMembershipInvitationAutomation(config: AutomationConfig): Promise<SendSummary> {
  const days = normalizeDays(config.reminderDays)
  const limit = Math.max(1, config.dailyLimit ?? DEFAULT_DAILY_LIMIT)
  const result: SendSummary = { sent: 0, skipped: 0, failed: 0, note: "" }
  const now = Date.now()
  const users = (await getRegisteredUsers()).filter((u) => u.emailVerified && isInvitable(u))

  for (const u of users) {
    const stage = nextStage(u)
    if (stage === "manual-reminder") continue // sequence complete
    const age = now - u.registeredAt.getTime()
    const sinceLast = u.lastInvitedAt ? now - u.lastInvitedAt.getTime() : Infinity
    const stageIndex = STAGES.indexOf(stage)
    // Wait an hour after sign-up so the welcome/verification email lands first.
    const due = stageIndex === 0 ? age >= HOUR : age >= days[stageIndex - 1] * DAY && sinceLast >= MIN_GAP
    if (!due) continue
    if (result.sent >= limit) {
      result.note = `Daily limit of ${limit} reached; the rest will be sent on the next run.`
      break
    }
    // Claim the stage so concurrent runs never send it twice.
    const claimed = await db
      .insert(emailSends)
      .values({ automationKey: "membership-invitation", dedupeKey: `membership-invite:${u.id}:${stage}`, recipient: u.email })
      .onConflictDoNothing()
      .returning({ id: emailSends.id })
    if (!claimed.length) {
      result.skipped++
      continue
    }
    const outcome = await deliver(u, stage, "automation", null)
    if (outcome !== "sent") await db.delete(emailSends).where(eq(emailSends.id, claimed[0].id))
    result[outcome]++
  }
  return result
}

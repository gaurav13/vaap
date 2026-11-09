import "server-only"
import { and, desc, eq, gte, inArray, isNull, lt, ne, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  articles,
  emailAutomationRuns,
  emailAutomations,
  emailSends,
  emailSuppressions,
  events,
  members,
  membershipApplications,
  news,
  newsletterIssues,
  user,
} from "@/lib/db/schema"
import { sendEmail } from "@/lib/mailer"
import { createToken } from "@/lib/email-tokens"
import { appBaseUrl, getLiveContent, renderWith } from "@/lib/email-templates/service"
import type { EmailContent, EmailTemplateKey } from "@/lib/email-templates/registry"
import { getRegisteredUsers, isInvitable } from "@/lib/membership-funnel"
import { runMembershipInvitationAutomation } from "@/lib/membership-invitations"
import {
  AUTOMATIONS,
  getAutomation,
  type AutomationConfig,
  type AutomationDefinition,
  type AutomationKey,
  type SegmentKey,
} from "./definitions"

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export type Recipient = { email: string; name: string; refId?: string; meta?: string; createdAt?: Date | null }
export type Trigger = "cron" | "manual" | "event" | "individual"
export type RunResult = { sent: number; skipped: number; failed: number; note: string }

// --- State ------------------------------------------------------------------

export async function getAutomationStates() {
  const rows = await db.select().from(emailAutomations)
  return AUTOMATIONS.map((def) => {
    const row = rows.find((r) => r.key === def.key)
    return {
      def,
      enabled: row?.enabled ?? def.defaultEnabled ?? true,
      config: { ...def.defaults, ...((row?.config as AutomationConfig) ?? {}) } as AutomationConfig,
      lastRunAt: row?.lastRunAt ?? null,
      lastSentAt: row?.lastSentAt ?? null,
      totalSent: row?.totalSent ?? 0,
    }
  })
}

export async function getAutomationState(key: AutomationKey) {
  return (await getAutomationStates()).find((s) => s.def.key === key)!
}

// --- Segments ---------------------------------------------------------------

function uniqueByEmail(list: Recipient[]) {
  const seen = new Map<string, Recipient>()
  for (const r of list) {
    const email = r.email?.trim().toLowerCase()
    if (!email || seen.has(email)) continue
    seen.set(email, { ...r, email })
  }
  return [...seen.values()]
}

export async function getSegment(key: SegmentKey): Promise<Recipient[]> {
  const now = new Date()
  if (key === "confirmed") {
    const rows = await db
      .select({ email: members.email, name: members.name, id: members.id, meta: members.category, createdAt: members.joinedAt })
      .from(members)
      .where(
        and(
          isNull(members.deletedAt),
          eq(members.status, "active"),
          eq(members.goodStanding, true),
          or(isNull(members.expiresAt), gte(members.expiresAt, now)),
        ),
      )
      .orderBy(desc(members.joinedAt))
    return uniqueByEmail(rows.map((r) => ({ ...r, refId: String(r.id) })))
  }
  if (key === "expired") {
    const rows = await db
      .select({ email: members.email, name: members.name, id: members.id, meta: members.category, createdAt: members.expiresAt })
      .from(members)
      .where(and(isNull(members.deletedAt), or(eq(members.status, "expired"), lt(members.expiresAt, now))))
    return uniqueByEmail(rows.map((r) => ({ ...r, refId: String(r.id) })))
  }
  if (key === "inactive") {
    const rows = await db
      .select({ email: members.email, name: members.name, id: members.id, meta: members.status, createdAt: members.joinedAt })
      .from(members)
      .where(and(isNull(members.deletedAt), or(eq(members.status, "suspended"), eq(members.goodStanding, false))))
    return uniqueByEmail(rows.map((r) => ({ ...r, refId: String(r.id) })))
  }
  if (key === "pending-verification") {
    const rows = await db
      .select({ email: user.email, name: user.name, id: user.id, createdAt: user.createdAt })
      .from(user)
      .where(and(eq(user.emailVerified, false), ne(user.role, "admin")))
      .orderBy(desc(user.createdAt))
    return uniqueByEmail(rows.map((r) => ({ ...r, refId: r.id, meta: "Unverified email" })))
  }
  if (key === "registered-unpaid") {
    const rows = (await getRegisteredUsers()).filter((u) => u.emailVerified && isInvitable(u))
    return rows.map((u) => ({ email: u.email.toLowerCase(), name: u.name, refId: u.id, meta: `${u.invitationsSent} sent`, createdAt: u.registeredAt }))
  }
  // Incomplete applications: unsubmitted, not rejected, and the applicant has
  // neither submitted another application nor become a member since.
  const rows = await db
    .select({
      id: membershipApplications.id,
      email: membershipApplications.email,
      name: membershipApplications.name,
      category: membershipApplications.category,
      createdAt: membershipApplications.createdAt,
    })
    .from(membershipApplications)
    .where(
      and(
        eq(membershipApplications.completed, false),
        ne(membershipApplications.status, "rejected"),
        sql`NOT EXISTS (SELECT 1 FROM "membershipApplications" ma WHERE lower(ma.email) = lower(${membershipApplications.email}) AND ma.completed = true)`,
        sql`NOT EXISTS (SELECT 1 FROM members m WHERE lower(m.email) = lower(${membershipApplications.email}) AND m."deletedAt" IS NULL)`,
      ),
    )
    .orderBy(desc(membershipApplications.createdAt))
  return uniqueByEmail(rows.map((r) => ({ email: r.email, name: r.name, refId: String(r.id), meta: r.category, createdAt: r.createdAt })))
}

// --- Suppression ------------------------------------------------------------

async function suppressedFor(topic: string) {
  const rows = await db
    .select({ email: emailSuppressions.email })
    .from(emailSuppressions)
    .where(inArray(emailSuppressions.topic, [topic, "all"]))
  return new Set(rows.map((r) => r.email.toLowerCase()))
}

export async function suppress(email: string, topic: string, reason: string, source: "recipient" | "admin") {
  await db
    .insert(emailSuppressions)
    .values({ email: email.trim().toLowerCase(), topic, reason, source })
    .onConflictDoNothing()
}

// --- Delivery ---------------------------------------------------------------

function unsubscribeUrl(email: string, topic: string) {
  return `${appBaseUrl()}/api/email/unsubscribe?token=${encodeURIComponent(createToken("unsubscribe", email, { topic, ttlDays: 365 }))}`
}

/** Sends one automation email at most once per dedupe key. */
async function deliver(
  def: AutomationDefinition,
  r: Recipient,
  dedupeKey: string,
  content: EmailContent,
  vars: Record<string, string>,
): Promise<"sent" | "skipped" | "failed"> {
  const claimed = await db
    .insert(emailSends)
    .values({ automationKey: def.key, dedupeKey, recipient: r.email })
    .onConflictDoNothing()
    .returning({ id: emailSends.id })
  if (!claimed.length) return "skipped"

  const unsub = def.marketing ? unsubscribeUrl(r.email, def.key) : undefined
  const rendered = renderWith(content, { name: r.name || "Member", ...vars }, { unsubscribeUrl: unsub })
  const ok = await sendEmail({
    to: r.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    templateKey: def.templateKey,
    headers: unsub ? { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined,
  })
  if (!ok) {
    // Release the claim so the next run can retry this recipient.
    await db.delete(emailSends).where(eq(emailSends.id, claimed[0].id))
    return "failed"
  }
  return "sent"
}

async function startRun(key: AutomationKey, trigger: Trigger, actor?: string | null) {
  const [run] = await db
    .insert(emailAutomationRuns)
    .values({ automationKey: key, trigger, actor: actor ?? null })
    .returning({ id: emailAutomationRuns.id })
  return run.id
}

async function finishRun(runId: number, key: AutomationKey, result: RunResult) {
  const now = new Date()
  await db
    .update(emailAutomationRuns)
    .set({ ...result, finishedAt: now })
    .where(eq(emailAutomationRuns.id, runId))
  await db
    .insert(emailAutomations)
    .values({ key, lastRunAt: now, lastSentAt: result.sent ? now : null, totalSent: result.sent })
    .onConflictDoUpdate({
      target: emailAutomations.key,
      set: {
        lastRunAt: now,
        ...(result.sent ? { lastSentAt: now } : {}),
        totalSent: sql`${emailAutomations.totalSent} + ${result.sent}`,
      },
    })
}

async function sendToAll(
  def: AutomationDefinition,
  recipients: Recipient[],
  keyFor: (r: Recipient) => string,
  content: EmailContent,
  vars: (r: Recipient) => Record<string, string>,
) {
  const blocked = await suppressedFor(def.key)
  const result: RunResult = { sent: 0, skipped: 0, failed: 0, note: "" }
  for (const r of recipients) {
    if (blocked.has(r.email)) {
      result.skipped++
      continue
    }
    result[await deliver(def, r, keyFor(r), content, vars(r))]++
  }
  return result
}

// --- Helpers ----------------------------------------------------------------

export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

function formatDate(d: Date | null) {
  if (!d) return "To be announced"
  return d.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" })
}

function oneLine(s: string | null | undefined, max = 140) {
  const t = (s ?? "").replace(/\s+/g, " ").trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

// --- Automations ------------------------------------------------------------

async function runArticleInvite(def: AutomationDefinition) {
  const week = isoWeekKey()
  const content = await getLiveContent(def.templateKey as EmailTemplateKey)
  return sendToAll(def, await getSegment("confirmed"), (r) => `article-invite:${week}:${r.email}`, content, () => ({}))
}

export async function runEventAnnouncement(def: AutomationDefinition, eventId: number) {
  const [ev] = await db.select().from(events).where(eq(events.id, eventId)).limit(1)
  if (!ev) return { sent: 0, skipped: 0, failed: 0, note: "Event not found" }
  if (!ev.published || ev.status !== "approved") {
    return { sent: 0, skipped: 0, failed: 0, note: "Event is not published" }
  }
  const content = await getLiveContent(def.templateKey as EmailTemplateKey)
  const vars = {
    eventTitle: ev.title,
    eventDate: ev.timeLabel?.trim() || formatDate(ev.startsAt),
    eventLocation: [ev.location, ev.city].filter(Boolean).join(" · ") || "Online",
    eventDescription: oneLine(ev.description, 400),
    eventUrl: `${appBaseUrl()}/events/${ev.slug || ev.id}`,
  }
  const result = await sendToAll(def, await getSegment("confirmed"), (r) => `event:${ev.id}:${r.email}`, content, () => vars)
  return { ...result, note: ev.title }
}

async function runVerificationReminders(def: AutomationDefinition, config: AutomationConfig) {
  const interval = Math.max(1, config.intervalDays ?? 3) * DAY
  const max = Math.max(1, config.maxReminders ?? 3)
  const history = await db
    .select({ dedupeKey: emailSends.dedupeKey, createdAt: emailSends.createdAt })
    .from(emailSends)
    .where(eq(emailSends.automationKey, def.key))
  const byUser = new Map<string, { count: number; last: number }>()
  for (const h of history) {
    const userId = h.dedupeKey.split(":")[1]
    const cur = byUser.get(userId) ?? { count: 0, last: 0 }
    byUser.set(userId, { count: cur.count + 1, last: Math.max(cur.last, h.createdAt.getTime()) })
  }
  const now = Date.now()
  const due = (await getSegment("pending-verification")).filter((r) => {
    const h = byUser.get(r.refId!) ?? { count: 0, last: 0 }
    const age = now - (r.createdAt?.getTime() ?? now)
    return h.count < max && age >= DAY && now - h.last >= interval
  })
  const content = await getLiveContent(def.templateKey as EmailTemplateKey)
  return sendToAll(
    def,
    due,
    (r) => `verify:${r.refId}:${(byUser.get(r.refId!)?.count ?? 0) + 1}`,
    content,
    (r) => ({ url: verifyUrl(r) }),
  )
}

function verifyUrl(r: Recipient) {
  return `${appBaseUrl()}/api/email/verify?token=${encodeURIComponent(createToken("verify", r.email, { id: r.refId }))}`
}

function resumeUrl(r: Recipient) {
  return `${appBaseUrl()}/membership/apply?resume=${encodeURIComponent(createToken("resume", r.email, { id: r.refId }))}`
}

async function runIncompleteReminders(def: AutomationDefinition, config: AutomationConfig) {
  const stages = [24, config.followUp3d ? 72 : 0, config.followUp7d ? 168 : 0].filter(Boolean)
  const now = Date.now()
  const content = await getLiveContent(def.templateKey as EmailTemplateKey)
  const due: (Recipient & { stage: number })[] = []
  for (const r of await getSegment("incomplete-applications")) {
    const age = now - (r.createdAt?.getTime() ?? now)
    if (age > 30 * DAY) continue
    const stage = [...stages].reverse().find((h) => age >= h * HOUR)
    if (stage) due.push({ ...r, stage })
  }
  return sendToAll(
    def,
    due,
    (r) => `incomplete:${r.refId}:${(r as Recipient & { stage: number }).stage}`,
    content,
    (r) => ({ category: r.meta ?? "VAAP membership", url: resumeUrl(r) }),
  )
}

// --- Newsletter -------------------------------------------------------------

export async function buildNewsletterContent(weekKey: string): Promise<EmailContent> {
  const since = new Date(Date.now() - 7 * DAY)
  const base = appBaseUrl()
  const [recentArticles, upcoming, recentNews] = await Promise.all([
    db
      .select({ title: articles.title, slug: articles.slug, excerpt: articles.excerpt })
      .from(articles)
      .where(and(eq(articles.status, "published"), gte(articles.publishedAt, since)))
      .orderBy(desc(articles.publishedAt))
      .limit(5),
    db
      .select({ id: events.id, slug: events.slug, title: events.title, startsAt: events.startsAt, timeLabel: events.timeLabel, city: events.city })
      .from(events)
      .where(and(eq(events.published, true), eq(events.status, "approved"), gte(events.startsAt, new Date())))
      .orderBy(events.startsAt)
      .limit(5),
    db
      .select({ id: news.id, title: news.title, category: news.category })
      .from(news)
      .where(and(eq(news.published, true), gte(news.createdAt, since)))
      .orderBy(desc(news.createdAt))
      .limit(5),
  ])

  const sections: string[] = []
  if (recentArticles.length) {
    sections.push(
      ["**Latest articles**", ...recentArticles.map((a) => `- [${a.title}](${base}/insights/${a.slug})${a.excerpt ? ` — ${oneLine(a.excerpt, 110)}` : ""}`)].join("\n"),
    )
  }
  if (upcoming.length) {
    sections.push(
      ["**Upcoming events**", ...upcoming.map((e) => `- [${e.title}](${base}/events/${e.slug || e.id}) · ${e.timeLabel?.trim() || formatDate(e.startsAt)}${e.city ? ` · ${e.city}` : ""}`)].join("\n"),
    )
  }
  if (recentNews.length) {
    sections.push(
      ["**Community announcements & industry news**", ...recentNews.map((n) => `- [${n.title}](${base}/news/${n.id}) · ${n.category}`)].join("\n"),
    )
  }
  if (!sections.length) {
    sections.push("It has been a quieter week on the website. Visit the VAAP site for the full archive of insights, events and news.")
  }

  const template = await getLiveContent("automation.newsletter")
  const monday = weekStart(weekKey)
  const weekLabel = `Week of ${monday.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`
  const fill = (s: string) => s.replaceAll("{{weekLabel}}", weekLabel).replaceAll("{{digest}}", sections.join("\n\n"))
  return { ...template, subject: fill(template.subject), heading: fill(template.heading), body: fill(template.body), footnote: fill(template.footnote) }
}

function weekStart(weekKey: string) {
  const [y, w] = weekKey.split("-W").map(Number)
  const jan4 = new Date(Date.UTC(y, 0, 4))
  const monday = new Date(jan4.getTime() - ((jan4.getUTCDay() || 7) - 1) * DAY)
  return new Date(monday.getTime() + (w - 1) * 7 * DAY)
}

export async function ensureNewsletterIssue(weekKey = isoWeekKey(), actor?: string | null) {
  const [existing] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.weekKey, weekKey)).limit(1)
  if (existing) return existing
  const content = await buildNewsletterContent(weekKey)
  await db.insert(newsletterIssues).values({ weekKey, content, updatedBy: actor ?? null }).onConflictDoNothing()
  const [row] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.weekKey, weekKey)).limit(1)
  return row
}

export async function sendNewsletterIssue(issueId: number, trigger: Trigger, actor?: string | null) {
  const def = getAutomation("newsletter")!
  // Atomically move draft -> sending so a double click cannot send twice.
  const [issue] = await db
    .update(newsletterIssues)
    .set({ status: "sending", updatedAt: new Date() })
    .where(and(eq(newsletterIssues.id, issueId), eq(newsletterIssues.status, "draft")))
    .returning()
  if (!issue) return { sent: 0, skipped: 0, failed: 0, note: "Issue is already sending or sent" }
  const runId = await startRun("newsletter", trigger, actor)
  const result = await sendToAll(def, await getSegment("confirmed"), (r) => `newsletter:${issue.id}:${r.email}`, issue.content, () => ({}))
  result.note = issue.weekKey
  await db
    .update(newsletterIssues)
    .set({ status: "sent", sentAt: new Date(), sentCount: sql`${newsletterIssues.sentCount} + ${result.sent}`, updatedAt: new Date() })
    .where(eq(newsletterIssues.id, issue.id))
  await finishRun(runId, "newsletter", result)
  return result
}

// --- Entry points -----------------------------------------------------------

export async function runAutomation(
  key: AutomationKey,
  opts: { trigger: Trigger; actor?: string | null; eventId?: number },
): Promise<RunResult> {
  const state = await getAutomationState(key)
  const def = state.def

  if (key === "newsletter") {
    const issue = await ensureNewsletterIssue(isoWeekKey(), opts.actor)
    if (opts.trigger === "cron" && state.config.mode !== "auto") {
      return { sent: 0, skipped: 0, failed: 0, note: `Draft ${issue.weekKey} ready for review` }
    }
    return sendNewsletterIssue(issue.id, opts.trigger, opts.actor)
  }

  const runId = await startRun(key, opts.trigger, opts.actor)
  let result: RunResult
  try {
    if (key === "article-invite") result = await runArticleInvite(def)
    else if (key === "event-announcement") {
      result = opts.eventId
        ? await runEventAnnouncement(def, opts.eventId)
        : { sent: 0, skipped: 0, failed: 0, note: "Choose an event to announce" }
    } else if (key === "verification-reminder") result = await runVerificationReminders(def, state.config)
    else if (key === "membership-invitation") result = await runMembershipInvitationAutomation(state.config)
    else result = await runIncompleteReminders(def, state.config)
  } catch (err) {
    console.error(`[email-automation] ${key} failed:`, err)
    result = { sent: 0, skipped: 0, failed: 0, note: err instanceof Error ? err.message.slice(0, 200) : "Run failed" }
  }
  await finishRun(runId, key, result)
  return result
}

/** Called by the daily cron. Weekly automations only run on their weekday. */
export async function runDueAutomations(now = new Date()) {
  const results: Record<string, RunResult | "paused" | "not-due"> = {}
  for (const state of await getAutomationStates()) {
    const { def, config } = state
    if (!state.enabled) {
      results[def.key] = "paused"
      continue
    }
    if (def.schedule === "on-publish" || (def.schedule === "weekly" && now.getUTCDay() !== (config.weekday ?? 1))) {
      results[def.key] = "not-due"
      continue
    }
    results[def.key] = await runAutomation(def.key, { trigger: "cron" })
  }
  return results
}

/** Hook for event publishing; respects the automation's on/off switch. */
export async function announceEventIfEnabled(eventId: number) {
  const state = await getAutomationState("event-announcement")
  if (!state.enabled) return
  await runAutomation("event-announcement", { trigger: "event", eventId })
}

/** Admin "send reminder now" for one person; bypasses schedule, not opt-outs. */
export async function sendIndividualReminder(key: "verification-reminder" | "incomplete-application", refId: string, actor: string) {
  const def = getAutomation(key)!
  const segment = await getSegment(def.segment)
  const r = segment.find((x) => x.refId === refId)
  if (!r) return { ok: false as const, message: "This person no longer needs a reminder." }
  if ((await suppressedFor(key)).has(r.email)) return { ok: false as const, message: "This address is suppressed." }
  const runId = await startRun(key, "individual", actor)
  const content = await getLiveContent(def.templateKey as EmailTemplateKey)
  const vars: Record<string, string> = key === "verification-reminder" ? { url: verifyUrl(r) } : { category: r.meta ?? "VAAP membership", url: resumeUrl(r) }
  const status = await deliver(def, r, `${key}:manual:${refId}:${Date.now()}`, content, vars)
  await finishRun(runId, key, { sent: status === "sent" ? 1 : 0, skipped: 0, failed: status === "failed" ? 1 : 0, note: r.email })
  return status === "sent"
    ? { ok: true as const, message: `Reminder sent to ${r.email}.` }
    : { ok: false as const, message: "Sending failed. Check the email configuration and logs." }
}

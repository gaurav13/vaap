import { redirect } from "next/navigation"
import { and, desc, eq, gte } from "drizzle-orm"
import { db } from "@/lib/db"
import { emailAutomationRuns, emailSuppressions, events, newsletterIssues } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { SEGMENTS, describeSchedule } from "@/lib/email-automations/definitions"
import { getAutomationStates, getSegment, isoWeekKey } from "@/lib/email-automations/engine"
import { EmailTabs } from "@/components/admin/email-tabs"
import { AutomationsManager } from "@/components/admin/automations-manager"

export const metadata = { title: "Email Automations | VAAP Admin" }

export default async function AdminEmailAutomationsPage() {
  const session = await getSession()
  if (session?.user?.role !== "admin") redirect("/admin")

  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  const [states, segmentLists, runs, suppressions, issues, recentEvents] = await Promise.all([
    getAutomationStates(),
    Promise.all(SEGMENTS.map((s) => getSegment(s.key).catch(() => []))),
    db.select().from(emailAutomationRuns).orderBy(desc(emailAutomationRuns.startedAt)).limit(25),
    db.select().from(emailSuppressions).orderBy(desc(emailSuppressions.createdAt)).limit(100),
    db.select().from(newsletterIssues).orderBy(desc(newsletterIssues.createdAt)).limit(6),
    db
      .select({ id: events.id, title: events.title, startsAt: events.startsAt })
      .from(events)
      .where(and(eq(events.published, true), gte(events.startsAt, since)))
      .orderBy(desc(events.startsAt))
      .limit(30),
  ])

  const segments = SEGMENTS.map((s, i) => ({ ...s, count: segmentLists[i].length }))
  const byKey = Object.fromEntries(SEGMENTS.map((s, i) => [s.key, segmentLists[i]]))
  const pick = (key: string) =>
    (byKey[key] ?? []).slice(0, 25).map((r) => ({
      refId: r.refId ?? "",
      email: r.email,
      name: r.name,
      meta: r.meta ?? "",
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    }))

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Emails</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted-2">
        Scheduled engagement emails. Each person receives a given message once, and opt-outs are always honoured.
      </p>
      <EmailTabs active="automations" />
      <AutomationsManager
        automations={states.map((s) => ({
          key: s.def.key,
          name: s.def.name,
          description: s.def.description,
          schedule: s.def.schedule,
          marketing: s.def.marketing,
          segmentName: SEGMENTS.find((x) => x.key === s.def.segment)?.name ?? s.def.segment,
          enabled: s.enabled,
          config: s.config,
          scheduleLabel: describeSchedule(s.def, s.config),
          lastRunAt: s.lastRunAt?.toISOString() ?? null,
          totalSent: s.totalSent,
        }))}
        segments={segments}
        pendingVerification={pick("pending-verification")}
        incompleteApplications={pick("incomplete-applications")}
        runs={runs.map((r) => ({ ...r, startedAt: r.startedAt.toISOString(), finishedAt: r.finishedAt?.toISOString() ?? null }))}
        suppressions={suppressions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))}
        newsletters={issues.map((n) => ({
          id: n.id,
          weekKey: n.weekKey,
          status: n.status,
          content: n.content,
          sentCount: n.sentCount,
          sentAt: n.sentAt?.toISOString() ?? null,
        }))}
        currentWeek={isoWeekKey()}
        events={recentEvents.map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt.toISOString() }))}
      />
    </div>
  )
}

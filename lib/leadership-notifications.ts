import "server-only"

import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { leadership, user as authUser } from "@/lib/db/schema"
import { sendTemplateEmail } from "@/lib/email-templates/service"
import type { EmailTemplateKey } from "@/lib/email-templates/registry"
import { claimEmailOnce } from "@/lib/email-dedupe"
import { formatAlertDate, sendAdminAlert } from "@/lib/admin-alerts"
import { APPLICATION_KINDS, MEMBERSHIP_INTENTS, sectionForKind } from "@/lib/leadership"

export const LEADERSHIP_EMAIL_EVENTS = ["received", "approved", "rejected"] as const
export type LeadershipEmailEvent = (typeof LEADERSHIP_EMAIL_EVENTS)[number]

const TEMPLATE: Record<LeadershipEmailEvent, EmailTemplateKey> = {
  received: "leadership.application-received",
  approved: "leadership.approved",
  rejected: "leadership.rejected",
}

type Applicant = {
  id: number
  name: string
  kind: string
  contactEmail: string | null
  applicantUserId: string | null
  reviewNote?: string | null
}

export const leadershipReference = (id: number) => `VAAP-LDR-${String(id).padStart(6, "0")}`

export function positionLabel(kind: string) {
  return APPLICATION_KINDS.find((k) => k.value === kind)?.label ?? sectionForKind(kind).label
}

async function recipientFor(row: Applicant) {
  if (row.contactEmail) return row.contactEmail
  if (!row.applicantUserId) return ""
  const [account] = await db.select({ email: authUser.email }).from(authUser).where(eq(authUser.id, row.applicantUserId)).limit(1)
  return account?.email ?? ""
}

async function saveStatus(id: number, event: LeadershipEmailEvent, entry: Record<string, unknown>) {
  try {
    await db
      .update(leadership)
      .set({ notifications: sql`coalesce(${leadership.notifications}, '{}'::jsonb) || ${JSON.stringify({ [event]: entry })}::jsonb` })
      .where(eq(leadership.id, id))
  } catch (err) {
    console.error("[leadership] notification status save failed:", err instanceof Error ? err.message : err)
  }
}

/**
 * Sends one applicant notification at most once per application and event.
 * Never throws: an email problem must not affect the application decision.
 */
export async function notifyLeadershipApplicant(row: Applicant, event: LeadershipEmailEvent) {
  try {
    const to = await recipientFor(row)
    const [current] = await db.select({ n: leadership.notifications }).from(leadership).where(eq(leadership.id, row.id)).limit(1)
    const attempts = (current?.n?.[event]?.attempts ?? 0) + 1
    if (!to) {
      await saveStatus(row.id, event, { status: "failed", at: new Date().toISOString(), attempts, recipient: "", error: "No applicant email address" })
      return false
    }

    const release = await claimEmailOnce(TEMPLATE[event], `leadership:${event}:${row.id}`, to)
    if (!release) return true

    let status: "sent" | "failed" | "skipped" = "failed"
    let error: string | undefined
    try {
      const delivered = await sendTemplateEmail({
        to,
        key: TEMPLATE[event],
        vars: {
          name: row.name,
          position: positionLabel(row.kind),
          reference: leadershipReference(row.id),
          statusUrl: "/leadership/apply",
          reason: row.reviewNote ?? "",
        },
      })
      status = delivered ? "sent" : "skipped"
      if (!delivered) error = "Email delivery is not configured"
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }
    if (status !== "sent") await release()
    await saveStatus(row.id, event, { status, at: new Date().toISOString(), attempts, recipient: to, ...(error ? { error: error.slice(0, 500) } : {}) })
    return status === "sent"
  } catch (err) {
    console.error(`[leadership] ${event} notification failed:`, err instanceof Error ? err.message : err)
    return false
  }
}

export function alertAdminsOfLeadershipApplication(row: Applicant & { organization: string; membershipStatus: string }) {
  sendAdminAlert(
    "leadership",
    {
      name: row.name,
      position: positionLabel(row.kind),
      reference: leadershipReference(row.id),
      email: row.contactEmail ?? "",
      organization: row.organization || "—",
      membership: MEMBERSHIP_INTENTS.find((m) => m.value === row.membershipStatus)?.label ?? "Not stated",
      submittedAt: formatAlertDate(),
      reviewUrl: `/admin/leadership/${row.id}`,
      statusUrl: "/leadership/apply",
    },
    { dedupeKey: (to) => `leadership:admin:${row.id}:${to}` },
  )
}

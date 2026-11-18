import "server-only"
import { cache } from "react"
import { desc, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { membershipApplications } from "@/lib/db/schema"
import { isTestEmail } from "@/lib/email-guard"
import { getMemberDirectory, type DirectoryRow } from "@/lib/membership-funnel"
import { syncCardPaymentVerifications } from "@/lib/membership-state"
import { isPaymentConfirmed } from "@/lib/rbac"

/**
 * The single source of truth for membership numbers. Every dashboard, tab and
 * report reads from here so the same label always shows the same value.
 *
 * Definitions:
 * - Registered users: unique people (accounts + issued members, de-duplicated by email), internal roles excluded.
 * - Applications: submitted (completed) applications that are not soft-deleted. Drafts never count as submitted.
 * - Pending: submitted, awaiting a decision.
 * - Paid: submitted with a verified payment (or a no-fee / invitation category).
 * - Unpaid: submitted, awaiting a decision, payment not verified.
 * - Approved / Rejected: submitted and formally decided.
 * - Incomplete: started but never submitted, whatever their status field says.
 * - Active / Expired: issued memberships inside / past their validity period.
 *
 * Test addresses are counted (per Super Admin decision) and reported separately as a flag.
 */

export type ApplicationBucket = "incomplete" | "pending" | "approved" | "rejected"
export const REPORTING_TIMEZONE = "UTC"

type AppRow = {
  id: number
  email: string
  category: string
  status: string
  completed: boolean
  paymentMethod: string | null
  txid: string | null
  totalAmount: string | null
  invitationCode: string | null
  paymentVerifiedAt: Date | null
  archivedAt: Date | null
  createdAt: Date
}

export function applicationBucket(a: { completed: boolean; status: string }): ApplicationBucket {
  if (!a.completed) return "incomplete"
  if (a.status === "approved") return "approved"
  if (a.status === "rejected") return "rejected"
  return "pending"
}

export type MembershipFilters = {
  category?: string
  from?: Date
  to?: Date
}

export type MembershipStats = {
  registered: number
  applications: number
  pending: number
  paid: number
  unpaid: number
  approved: number
  rejected: number
  incomplete: number
  archived: number
  active: number
  expired: number
  flags: {
    testApplications: number
    testRegistered: number
    /** Active members whose approved application has no recorded payment verification. */
    activeWithoutPaymentRecord: number
    /** Paid applications still waiting for a decision. Paid is never the same as active. */
    paidAwaitingApproval: number
  }
  categories: string[]
  generatedAt: Date
}

const loadApplications = cache(async (): Promise<AppRow[]> =>
  syncCardPaymentVerifications(
    await db
      .select({
        id: membershipApplications.id,
        email: membershipApplications.email,
        category: membershipApplications.category,
        status: membershipApplications.status,
        completed: membershipApplications.completed,
        paymentMethod: membershipApplications.paymentMethod,
        txid: membershipApplications.txid,
        totalAmount: membershipApplications.totalAmount,
        invitationCode: membershipApplications.invitationCode,
        paymentVerifiedAt: membershipApplications.paymentVerifiedAt,
        archivedAt: membershipApplications.archivedAt,
        createdAt: membershipApplications.createdAt,
      })
      .from(membershipApplications)
      .where(isNull(membershipApplications.deletedAt))
      .orderBy(desc(membershipApplications.createdAt)),
  ),
)

function inRange(d: Date | null, f: MembershipFilters) {
  if (!d) return !f.from && !f.to
  if (f.from && d < f.from) return false
  if (f.to && d > f.to) return false
  return true
}

export function computeStats(apps: AppRow[], people: DirectoryRow[], f: MembershipFilters = {}): MembershipStats {
  const categories = [...new Set([...apps.map((a) => a.category), ...people.map((p) => p.category ?? "")].filter(Boolean))].sort()
  const cat = (c: string | null) => !f.category || c === f.category
  const A = apps.filter((a) => cat(a.category) && inRange(a.createdAt, f))
  const P = people.filter((p) => cat(p.category) && inRange(p.registeredAt, f))

  const submitted = A.filter((a) => a.completed)
  const pending = submitted.filter((a) => applicationBucket(a) === "pending")
  const paid = submitted.filter((a) => isPaymentConfirmed(a))
  const approvedApps = submitted.filter((a) => a.status === "approved")
  const paidApprovedEmails = new Set(approvedApps.filter((a) => isPaymentConfirmed(a)).map((a) => a.email.trim().toLowerCase()))
  const active = P.filter((p) => p.stage === "active")

  return {
    registered: P.length,
    applications: submitted.length,
    pending: pending.length,
    paid: paid.length,
    unpaid: pending.filter((a) => !isPaymentConfirmed(a)).length,
    approved: approvedApps.length,
    rejected: submitted.filter((a) => a.status === "rejected").length,
    incomplete: A.filter((a) => !a.completed).length,
    archived: A.filter((a) => a.archivedAt).length,
    active: active.length,
    expired: P.filter((p) => p.stage === "expired").length,
    flags: {
      testApplications: A.filter((a) => isTestEmail(a.email)).length,
      testRegistered: P.filter((p) => isTestEmail(p.email)).length,
      activeWithoutPaymentRecord: active.filter((p) => !paidApprovedEmails.has(p.email.trim().toLowerCase())).length,
      paidAwaitingApproval: pending.filter((a) => isPaymentConfirmed(a)).length,
    },
    categories,
    generatedAt: new Date(),
  }
}

export const getMembershipStats = cache(async (f: MembershipFilters = {}) => {
  const [apps, directory] = await Promise.all([loadApplications(), getMemberDirectory()])
  return computeStats(apps, directory.rows, f)
})

export function formatReportingTime(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: REPORTING_TIMEZONE,
  }).format(d) + " UTC"
}

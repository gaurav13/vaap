import "server-only"

import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { members, membershipApplications } from "@/lib/db/schema"
import { stripe } from "@/lib/stripe"

export type MembershipState =
  | "not-member"
  | "payment-pending"
  | "under-review"
  | "active"
  | "expired"
  | "suspended"
  | "rejected"

export const MEMBERSHIP_STATE_LABEL: Record<MembershipState, string> = {
  "not-member": "Not Paid",
  "payment-pending": "Payment Pending",
  "under-review": "Under Review",
  active: "Active Paid Member",
  expired: "Membership Expired",
  suspended: "Membership Suspended",
  rejected: "Application Rejected",
}

type Member = typeof members.$inferSelect
type Application = typeof membershipApplications.$inferSelect

export type MembershipStanding = {
  state: MembershipState
  /** The approved member record. Only set for states that came from a real, issued membership. */
  member: Member | null
  application: Application | null
}

/**
 * Placeholder rows are created when a user saves their profile before applying.
 * They hold profile data only and never represent an issued membership.
 */
export function isIssuedMembership(m: Pick<Member, "status" | "membershipId"> | null | undefined) {
  return Boolean(m && m.status !== "pending" && !m.membershipId.startsWith("PENDING-"))
}

/**
 * Card payments count only once Stripe reports the session as paid. The result is
 * stored on the application so the webhook and this lookup agree and Stripe is
 * only asked once.
 */
async function isCardPaymentConfirmed(app: Application) {
  if (app.paymentVerifiedAt) return true
  if (!app.txid?.startsWith("cs_")) return false
  try {
    const session = await stripe.checkout.sessions.retrieve(app.txid)
    if (session.payment_status !== "paid") return false
    await db
      .update(membershipApplications)
      .set({ paymentVerifiedAt: new Date(), paymentVerifiedBy: "stripe" })
      .where(and(eq(membershipApplications.id, app.id), isNull(membershipApplications.paymentVerifiedAt)))
    return true
  } catch {
    return false
  }
}

async function isPaymentConfirmed(app: Application) {
  if (app.totalAmount === "No payment required" || app.invitationCode) return true
  if (app.paymentMethod === "card") return isCardPaymentConfirmed(app)
  // Crypto (and anything else) needs a Super Admin to confirm the transfer on-chain.
  return Boolean(app.paymentVerifiedAt)
}

/** Server-side payment check used before any approval: Stripe for card, Super Admin check for crypto. */
export async function isApplicationPaymentConfirmed(app: Application) {
  return app.completed && (await isPaymentConfirmed(app))
}

type CardCheckable = Pick<Application, "id" | "completed" | "status" | "paymentMethod" | "txid" | "paymentVerifiedAt">

/**
 * Asks Stripe about submitted, still-pending card applications that are not yet
 * marked verified, and records the result. Mutates `paymentVerifiedAt` on the
 * passed rows so callers can classify them without re-querying.
 */
export async function syncCardPaymentVerifications<T extends CardCheckable>(apps: T[]) {
  const unchecked = apps
    .filter((a) => a.completed && a.status === "pending" && a.paymentMethod === "card" && !a.paymentVerifiedAt && a.txid?.startsWith("cs_"))
    .slice(0, 25)
  await Promise.all(
    unchecked.map(async (a) => {
      try {
        const session = await stripe.checkout.sessions.retrieve(a.txid as string)
        if (session.payment_status !== "paid") return
        const verifiedAt = new Date()
        await db
          .update(membershipApplications)
          .set({ paymentVerifiedAt: verifiedAt, paymentVerifiedBy: "stripe" })
          .where(and(eq(membershipApplications.id, a.id), isNull(membershipApplications.paymentVerifiedAt)))
        a.paymentVerifiedAt = verifiedAt
      } catch {
        // Unreachable or unknown session: leave unverified.
      }
    }),
  )
  return apps
}

/**
 * Single source of truth for a user's paid-membership standing. Payment
 * confirmation and staff approval are checked independently: a completed
 * checkout alone never makes someone an active member.
 */
export async function getMembershipStanding(userId: string, email: string): Promise<MembershipStanding> {
  const lowerEmail = email.toLowerCase()

  const [memberRows, [application]] = await Promise.all([
    db
      .select()
      .from(members)
      .where(and(sql`(${members.userId} = ${userId} or lower(${members.email}) = ${lowerEmail})`, isNull(members.deletedAt)))
      .orderBy(desc(members.joinedAt)),
    db
      .select()
      .from(membershipApplications)
      .where(sql`lower(${membershipApplications.email}) = ${lowerEmail}`)
      .orderBy(desc(membershipApplications.createdAt))
      .limit(1),
  ])

  const member = memberRows.find(isIssuedMembership) ?? null

  if (member) {
    // Same rule as the admin funnel: only a stored expiry ends a membership, so
    // legacy members without one keep their access.
    if (member.status === "expired" || (member.expiresAt && member.expiresAt.getTime() < Date.now())) {
      return { state: "expired", member, application: application ?? null }
    }
    if (member.status === "active" && member.goodStanding) {
      return { state: "active", member, application: application ?? null }
    }
    return { state: "suspended", member, application: application ?? null }
  }

  // Drafts are saved mid-form before the final submit, so they are not an application yet.
  if (!application || !application.completed) return { state: "not-member", member: null, application: null }
  if (application.status === "rejected") return { state: "rejected", member: null, application }

  const paid = await isPaymentConfirmed(application)
  return { state: paid ? "under-review" : "payment-pending", member: null, application }
}

export function isActivePaidMember(standing: MembershipStanding) {
  return standing.state === "active"
}

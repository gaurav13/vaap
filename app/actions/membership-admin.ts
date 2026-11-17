"use server"

import crypto from "crypto"
import { and, desc, eq, gt, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  auditLogs,
  emailChangeRequests,
  emailLogs,
  members,
  membershipApplications,
  paymentReconciliations,
  user,
} from "@/lib/db/schema"
import { logActivity, requireManager, requireSuperAdmin, type AdminActor } from "@/lib/rbac"
import { stripe } from "@/lib/stripe"
import { brandedEmail, sendEmail } from "@/lib/mailer"
import { appBaseUrl, sendTemplateEmail } from "@/lib/email-templates/service"
import { getCurrentCertificate, issueCertificate } from "@/lib/certificates"
import { isApplicationPaymentConfirmed, isIssuedMembership } from "@/lib/membership-state"
import { setApplicationStatus } from "@/app/actions/admin"
import { setMemberStatus } from "@/app/actions/members"
import type { CaseStatus } from "@/lib/membership-case-status"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const lower = (s: string | null | undefined) => (s ?? "").trim().toLowerCase()

type App = typeof membershipApplications.$inferSelect
type Member = typeof members.$inferSelect

function deriveStatus(app: App | null, member: Member | null, paid: boolean): CaseStatus {
  if (member && isIssuedMembership(member)) {
    return member.status === "active" && member.goodStanding ? "approved" : "suspended"
  }
  if (!app) return "pending_payment"
  if (app.status === "rejected") return "rejected"
  if (app.status === "approved") return "approved"
  if (!paid) return "pending_payment"
  // Payment confirmed by Stripe or an admin, awaiting a membership decision.
  return app.paymentVerifiedBy && app.paymentVerifiedBy !== "stripe" ? "payment_received" : "pending_verification"
}

// --- Search -----------------------------------------------------------------

export type MembershipCaseSummary = {
  applicationId: number | null
  memberId: number | null
  name: string
  applicationEmail: string | null
  memberEmail: string | null
  loginEmail: string | null
  membershipId: string | null
  reference: string | null
  category: string
  paymentRef: string | null
  paymentMethod: string | null
  status: CaseStatus
  createdAt: string
}

export async function searchMembershipCases(query: string): Promise<Result<{ cases: MembershipCaseSummary[] }>> {
  try {
    await requireManager()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }
  }
  const q = query.trim().slice(0, 120)
  const like = `%${q}%`

  const [apps, memberRows, recRows] = await Promise.all([
    db
      .select()
      .from(membershipApplications)
      .where(
        q
          ? or(
              ilike(membershipApplications.name, like),
              ilike(membershipApplications.email, like),
              ilike(membershipApplications.reference, like),
              ilike(membershipApplications.txid, like),
            )
          : eq(membershipApplications.completed, true),
      )
      .orderBy(desc(membershipApplications.createdAt))
      .limit(40),
    db
      .select()
      .from(members)
      .where(
        and(
          isNull(members.deletedAt),
          q ? or(ilike(members.name, like), ilike(members.email, like), ilike(members.membershipId, like)) : sql`false`,
        ),
      )
      .limit(40),
    q
      ? db
          .select({ applicationId: paymentReconciliations.applicationId })
          .from(paymentReconciliations)
          .where(or(ilike(paymentReconciliations.paymentRef, like), ilike(paymentReconciliations.paymentEmail, like)))
          .limit(20)
      : Promise.resolve([] as { applicationId: number }[]),
  ])

  const extraIds = recRows.map((r) => r.applicationId).filter((id) => !apps.some((a) => a.id === id))
  if (extraIds.length) {
    apps.push(...(await db.select().from(membershipApplications).where(inArray(membershipApplications.id, extraIds))))
  }

  // Pull in the member record for every application and vice versa, matched by email.
  const emails = [...new Set([...apps.map((a) => lower(a.email)), ...memberRows.map((m) => lower(m.email))])]
  const [allMembers, users] = emails.length
    ? await Promise.all([
        db
          .select()
          .from(members)
          .where(and(isNull(members.deletedAt), inArray(sql<string>`lower(${members.email})`, emails))),
        db
          .select({ id: user.id, email: user.email })
          .from(user)
          .where(inArray(sql<string>`lower(${user.email})`, emails)),
      ])
    : [[], []]
  const userIds = [...new Set([...memberRows, ...allMembers].map((m) => m.userId).filter(Boolean) as string[])]
  const linkedUsers = userIds.length
    ? await db.select({ id: user.id, email: user.email }).from(user).where(inArray(user.id, userIds))
    : []

  const loginFor = (email: string | null, userId: string | null) =>
    linkedUsers.find((u) => u.id === userId)?.email ?? users.find((u) => lower(u.email) === lower(email))?.email ?? null

  const cases: MembershipCaseSummary[] = []
  const seenMembers = new Set<number>()
  const seenApps = new Set<number>()
  for (const app of apps) {
    if (seenApps.has(app.id)) continue
    seenApps.add(app.id)
    const member = allMembers.find((m) => lower(m.email) === lower(app.email) && isIssuedMembership(m)) ?? null
    if (member) seenMembers.add(member.id)
    cases.push({
      applicationId: app.id,
      memberId: member?.id ?? null,
      name: app.name,
      applicationEmail: app.email,
      memberEmail: member?.email ?? null,
      loginEmail: loginFor(app.email, member?.userId ?? null),
      membershipId: member?.membershipId ?? null,
      reference: app.reference,
      category: app.category,
      paymentRef: app.txid,
      paymentMethod: app.paymentMethod,
      status: deriveStatus(app, member, Boolean(app.paymentVerifiedAt) || app.totalAmount === "No payment required" || Boolean(app.invitationCode)),
      createdAt: app.createdAt.toISOString(),
    })
  }
  for (const m of memberRows) {
    if (seenMembers.has(m.id) || !isIssuedMembership(m)) continue
    cases.push({
      applicationId: null,
      memberId: m.id,
      name: m.name,
      applicationEmail: null,
      memberEmail: m.email,
      loginEmail: loginFor(m.email, m.userId),
      membershipId: m.membershipId,
      reference: null,
      category: m.category,
      paymentRef: null,
      paymentMethod: null,
      status: deriveStatus(null, m, true),
      createdAt: m.joinedAt.toISOString(),
    })
  }
  return { ok: true, cases: cases.slice(0, 50) }
}

// --- Case detail ------------------------------------------------------------

export type StripePaymentInfo = {
  ref: string
  amount: number
  currency: string
  email: string | null
  name: string | null
  paidAt: string
  status: string
  assignedApplicationId: number | null
}

export type MembershipCaseDetail = {
  summary: MembershipCaseSummary
  application: {
    id: number
    reference: string | null
    email: string
    category: string
    totalAmount: string | null
    paymentMethod: string | null
    txid: string | null
    cryptoCoin: string | null
    paymentVerifiedAt: string | null
    paymentVerifiedBy: string | null
    status: string
    completed: boolean
    createdAt: string
  } | null
  member: {
    id: number
    membershipId: string
    email: string
    status: string
    goodStanding: boolean
    votingEligible: boolean
    joinedAt: string
    expiresAt: string | null
  } | null
  loginUser: { id: string; email: string; emailVerified: boolean } | null
  payment: StripePaymentInfo | null
  reconciliations: { id: number; provider: string; paymentRef: string; amount: number | null; currency: string | null; paymentEmail: string | null; actorName: string; note: string; createdAt: string }[]
  pendingEmailChange: { id: number; newEmail: string; expiresAt: string; requestedByName: string } | null
  certificate: { status: string; issuedAt: string } | null
  confirmationEmails: { status: string; recipient: string; error: string | null; createdAt: string }[]
  history: { action: string; actorName: string; actorRole: string; details: string; createdAt: string }[]
}

async function stripeSessionInfo(ref: string): Promise<StripePaymentInfo | null> {
  if (!ref.startsWith("cs_")) return null
  try {
    const s = await stripe.checkout.sessions.retrieve(ref)
    const [assigned] = await db
      .select({ id: membershipApplications.id })
      .from(membershipApplications)
      .where(and(eq(membershipApplications.txid, s.id), sql`${membershipApplications.paymentVerifiedAt} is not null`))
      .limit(1)
    return {
      ref: s.id,
      amount: (s.amount_total ?? 0) / 100,
      currency: (s.currency ?? "").toUpperCase(),
      email: s.customer_details?.email ?? s.customer_email ?? null,
      name: s.customer_details?.name ?? null,
      paidAt: new Date(s.created * 1000).toISOString(),
      status: s.payment_status,
      assignedApplicationId: assigned?.id ?? null,
    }
  } catch {
    return null
  }
}

export async function getMembershipCase(input: { applicationId?: number | null; memberId?: number | null }): Promise<Result<{ detail: MembershipCaseDetail }>> {
  try {
    await requireManager()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }
  }
  let app: App | null = null
  let member: Member | null = null
  if (input.applicationId) {
    ;[app] = await db.select().from(membershipApplications).where(eq(membershipApplications.id, input.applicationId)).limit(1)
    app = app ?? null
  }
  if (input.memberId) {
    ;[member] = await db.select().from(members).where(eq(members.id, input.memberId)).limit(1)
    member = member ?? null
  }
  if (app && !member) {
    const rows = await db
      .select()
      .from(members)
      .where(and(isNull(members.deletedAt), sql`lower(${members.email}) = ${lower(app.email)}`))
    member = rows.find(isIssuedMembership) ?? null
  }
  if (member && !app) {
    ;[app] = await db
      .select()
      .from(membershipApplications)
      .where(sql`lower(${membershipApplications.email}) = ${lower(member.email)}`)
      .orderBy(desc(membershipApplications.createdAt))
      .limit(1)
    app = app ?? null
  }
  if (!app && !member) return { ok: false, error: "Record not found." }

  const contactEmail = member?.email ?? app?.email ?? ""
  const [loginUser] = member?.userId
    ? await db.select({ id: user.id, email: user.email, emailVerified: user.emailVerified }).from(user).where(eq(user.id, member.userId)).limit(1)
    : await db
        .select({ id: user.id, email: user.email, emailVerified: user.emailVerified })
        .from(user)
        .where(sql`lower(${user.email}) = ${lower(contactEmail)}`)
        .limit(1)

  const entityFilters = [
    app ? and(eq(auditLogs.entityType, "application"), eq(auditLogs.entityId, String(app.id))) : undefined,
    member ? and(eq(auditLogs.entityType, "member"), eq(auditLogs.entityId, String(member.id))) : undefined,
  ].filter(Boolean)

  const relatedEmails = [...new Set([app?.email, member?.email, loginUser?.email].filter(Boolean).map((e) => lower(e)))]

  const [reconciliations, [pendingChange], history, confirmationEmails, cert] = await Promise.all([
    app
      ? db.select().from(paymentReconciliations).where(eq(paymentReconciliations.applicationId, app.id)).orderBy(desc(paymentReconciliations.createdAt))
      : Promise.resolve([]),
    db
      .select()
      .from(emailChangeRequests)
      .where(
        and(
          isNull(emailChangeRequests.confirmedAt),
          isNull(emailChangeRequests.cancelledAt),
          gt(emailChangeRequests.expiresAt, new Date()),
          or(
            app ? eq(emailChangeRequests.applicationId, app.id) : sql`false`,
            loginUser ? eq(emailChangeRequests.userId, loginUser.id) : sql`false`,
          ),
        ),
      )
      .orderBy(desc(emailChangeRequests.createdAt))
      .limit(1),
    entityFilters.length
      ? db.select().from(auditLogs).where(or(...entityFilters)).orderBy(desc(auditLogs.createdAt)).limit(60)
      : Promise.resolve([]),
    relatedEmails.length
      ? db
          .select()
          .from(emailLogs)
          .where(and(eq(emailLogs.templateKey, "membership.approved"), inArray(sql<string>`lower(${emailLogs.recipient})`, relatedEmails)))
          .orderBy(desc(emailLogs.createdAt))
          .limit(10)
      : Promise.resolve([]),
    member ? getCurrentCertificate(member.id) : Promise.resolve(null),
  ])

  const paid = app ? Boolean(app.paymentVerifiedAt) || app.totalAmount === "No payment required" || Boolean(app.invitationCode) : true
  const payment = app?.txid ? await stripeSessionInfo(app.txid) : null

  const summary: MembershipCaseSummary = {
    applicationId: app?.id ?? null,
    memberId: member?.id ?? null,
    name: member?.name ?? app?.name ?? "",
    applicationEmail: app?.email ?? null,
    memberEmail: member?.email ?? null,
    loginEmail: loginUser?.email ?? null,
    membershipId: member && isIssuedMembership(member) ? member.membershipId : null,
    reference: app?.reference ?? null,
    category: member?.category ?? app?.category ?? "",
    paymentRef: app?.txid ?? null,
    paymentMethod: app?.paymentMethod ?? null,
    status: deriveStatus(app, member && isIssuedMembership(member) ? member : null, paid),
    createdAt: (app?.createdAt ?? member?.joinedAt ?? new Date()).toISOString(),
  }

  return {
    ok: true,
    detail: {
      summary,
      application: app
        ? {
            id: app.id,
            reference: app.reference,
            email: app.email,
            category: app.category,
            totalAmount: app.totalAmount,
            paymentMethod: app.paymentMethod,
            txid: app.txid,
            cryptoCoin: app.cryptoCoin,
            paymentVerifiedAt: app.paymentVerifiedAt?.toISOString() ?? null,
            paymentVerifiedBy: app.paymentVerifiedBy,
            status: app.status,
            completed: app.completed,
            createdAt: app.createdAt.toISOString(),
          }
        : null,
      member:
        member && isIssuedMembership(member)
          ? {
              id: member.id,
              membershipId: member.membershipId,
              email: member.email,
              status: member.status,
              goodStanding: member.goodStanding,
              votingEligible: member.votingEligible,
              joinedAt: member.joinedAt.toISOString(),
              expiresAt: member.expiresAt?.toISOString() ?? null,
            }
          : null,
      loginUser: loginUser ?? null,
      payment,
      reconciliations: reconciliations.map((r) => ({
        id: r.id,
        provider: r.provider,
        paymentRef: r.paymentRef,
        amount: r.amount,
        currency: r.currency,
        paymentEmail: r.paymentEmail,
        actorName: r.actorName,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      })),
      pendingEmailChange: pendingChange
        ? { id: pendingChange.id, newEmail: pendingChange.newEmail, expiresAt: pendingChange.expiresAt.toISOString(), requestedByName: pendingChange.requestedByName }
        : null,
      certificate: cert ? { status: cert.status, issuedAt: cert.issuedAt.toISOString() } : null,
      confirmationEmails: confirmationEmails.map((e) => ({ status: e.status, recipient: e.recipient, error: e.error, createdAt: e.createdAt.toISOString() })),
      history: history.map((h) => ({ action: h.action, actorName: h.actorName, actorRole: h.actorRole, details: h.details || h.target, createdAt: h.createdAt.toISOString() })),
    },
  }
}

// --- Payment search & reconciliation ----------------------------------------

/** Lists successful Stripe Checkout payments matching an email, name or reference. Read-only against Stripe. */
export async function searchStripePayments(query: string): Promise<Result<{ payments: StripePaymentInfo[] }>> {
  try {
    await requireSuperAdmin()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }
  }
  const q = lower(query)
  try {
    if (q.startsWith("cs_")) {
      const info = await stripeSessionInfo(query.trim())
      return { ok: true, payments: info && info.status === "paid" ? [info] : [] }
    }
    const list = await stripe.checkout.sessions.list({ limit: 100, status: "complete" })
    const matches = list.data.filter((s) => {
      if (s.payment_status !== "paid") return false
      if (!q) return true
      const hay = [s.id, s.customer_details?.email, s.customer_email, s.customer_details?.name, s.metadata?.applicantEmail, s.metadata?.applicantName, typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
    const ids = matches.map((s) => s.id)
    const assigned = ids.length
      ? await db
          .select({ id: membershipApplications.id, txid: membershipApplications.txid })
          .from(membershipApplications)
          .where(and(inArray(membershipApplications.txid, ids), sql`${membershipApplications.paymentVerifiedAt} is not null`))
      : []
    const recs = ids.length
      ? await db.select({ ref: paymentReconciliations.paymentRef, appId: paymentReconciliations.applicationId }).from(paymentReconciliations).where(inArray(paymentReconciliations.paymentRef, ids))
      : []
    return {
      ok: true,
      payments: matches.slice(0, 30).map((s) => ({
        ref: s.id,
        amount: (s.amount_total ?? 0) / 100,
        currency: (s.currency ?? "").toUpperCase(),
        email: s.customer_details?.email ?? s.customer_email ?? null,
        name: s.customer_details?.name ?? s.metadata?.applicantName ?? null,
        paidAt: new Date(s.created * 1000).toISOString(),
        status: s.payment_status,
        assignedApplicationId: recs.find((r) => r.ref === s.id)?.appId ?? assigned.find((a) => a.txid === s.id)?.id ?? null,
      })),
    }
  } catch (err) {
    return { ok: false, error: `Stripe lookup failed: ${err instanceof Error ? err.message : "unknown error"}` }
  }
}

/**
 * Links a verified Stripe payment (or a manually confirmed transfer) to an
 * application. The payment provider's records are never modified; the unique
 * payment reference blocks assigning one payment to two memberships.
 */
export async function reconcilePayment(input: {
  applicationId: number
  provider: "stripe" | "manual"
  paymentRef: string
  amount?: number
  currency?: string
  paymentEmail?: string
  note?: string
}): Promise<Result> {
  let actor: AdminActor
  try {
    actor = await requireSuperAdmin()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }
  }
  const ref = input.paymentRef.trim()
  if (!ref || ref.length > 200) return { ok: false, error: "A payment reference is required." }
  const [app] = await db.select().from(membershipApplications).where(eq(membershipApplications.id, input.applicationId)).limit(1)
  if (!app) return { ok: false, error: "Application not found." }

  let amount = input.amount != null ? Math.round(input.amount) : null
  let currency = input.currency?.trim().toUpperCase().slice(0, 8) || null
  let paymentEmail = input.paymentEmail?.trim().toLowerCase() || null
  let paidAt: Date | null = null

  if (input.provider === "stripe") {
    if (!ref.startsWith("cs_")) return { ok: false, error: "Stripe references must be a Checkout session ID (cs_...)." }
    const info = await stripeSessionInfo(ref)
    if (!info) return { ok: false, error: "That Stripe payment could not be found." }
    if (info.status !== "paid") return { ok: false, error: "Stripe does not report this payment as paid." }
    if (info.assignedApplicationId && info.assignedApplicationId !== app.id) {
      return { ok: false, error: `This payment is already assigned to application #${info.assignedApplicationId}.` }
    }
    amount = Math.round(info.amount)
    currency = info.currency
    paymentEmail = info.email
    paidAt = new Date(info.paidAt)
  } else {
    if (!input.note?.trim()) return { ok: false, error: "Add a note describing how the manual payment was confirmed." }
    if (paymentEmail && !EMAIL_RE.test(paymentEmail)) return { ok: false, error: "Payment email is not valid." }
  }

  const [existing] = await db.select().from(paymentReconciliations).where(eq(paymentReconciliations.paymentRef, ref)).limit(1)
  if (existing) {
    return {
      ok: false,
      error: existing.applicationId === app.id ? "This payment is already linked to this application." : `This payment is already assigned to application #${existing.applicationId}.`,
    }
  }

  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(isNull(members.deletedAt), sql`lower(${members.email}) = ${lower(app.email)}`))
    .limit(1)

  try {
    await db.insert(paymentReconciliations).values({
      applicationId: app.id,
      memberId: member?.id ?? null,
      provider: input.provider,
      paymentRef: ref,
      amount,
      currency,
      paymentEmail,
      paidAt,
      previousTxid: app.txid,
      note: (input.note ?? "").trim().slice(0, 1000),
      actorId: actor.id,
      actorName: actor.name,
    })
  } catch {
    return { ok: false, error: "This payment was assigned by another admin a moment ago." }
  }

  await db
    .update(membershipApplications)
    .set({
      completed: true,
      paymentVerifiedAt: new Date(),
      paymentVerifiedBy: actor.id,
      ...(input.provider === "stripe" ? { txid: ref, paymentMethod: "card" } : app.txid ? {} : { txid: ref }),
    })
    .where(eq(membershipApplications.id, app.id))

  await logActivity(actor, "payment.reconcile", {
    entityType: "application",
    entityId: app.id,
    target: `${app.name} · ${ref}`,
    details: `Linked ${input.provider} payment ${ref}${amount != null ? ` (${currency ?? ""} ${amount})` : ""}${paymentEmail ? ` paid by ${paymentEmail}` : ""}${app.txid && app.txid !== ref ? `; previous reference ${app.txid}` : ""}. ${input.note ?? ""}`.trim(),
  })
  revalidatePath("/admin/membership")
  revalidatePath("/admin/applications")
  return { ok: true }
}

// --- Status changes ----------------------------------------------------------

export async function setMembershipCaseStatus(input: {
  applicationId: number | null
  memberId: number | null
  status: CaseStatus
}): Promise<Result> {
  let actor: AdminActor
  try {
    actor = await requireManager()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }
  }

  const { applicationId, memberId, status } = input
  const needApp = () => (applicationId ? null : { ok: false as const, error: "This action needs a membership application." })

  switch (status) {
    case "pending_payment": {
      if (needApp()) return needApp()!
      if (actor.role !== "admin") return { ok: false, error: "Only a Super Admin can reset payment status." }
      const [app] = await db.select().from(membershipApplications).where(eq(membershipApplications.id, applicationId!)).limit(1)
      if (!app) return { ok: false, error: "Application not found." }
      if (app.status === "approved") return { ok: false, error: "Approved memberships cannot be moved back to pending payment. Suspend the membership instead." }
      await db
        .update(membershipApplications)
        .set({ paymentVerifiedAt: null, paymentVerifiedBy: null, status: "pending" })
        .where(eq(membershipApplications.id, app.id))
      await logActivity(actor, "payment.unverify", { entityType: "application", entityId: app.id, target: app.name })
      break
    }
    case "payment_received":
      return { ok: false, error: "Use Payment Reconciliation to record a received payment so the reference is checked for duplicates." }
    case "pending_verification": {
      if (needApp()) return needApp()!
      const res = await setApplicationStatus(applicationId!, "pending")
      if (!res.ok) return res
      break
    }
    case "approved": {
      if (memberId && !applicationId) {
        const res = await setMemberStatus(memberId, "active")
        if (res && "ok" in res && !res.ok) return { ok: false, error: "Could not reactivate the membership." }
        await logActivity(actor, "member.reactivate", { entityType: "member", entityId: memberId })
        break
      }
      if (needApp()) return needApp()!
      const [app] = await db.select().from(membershipApplications).where(eq(membershipApplications.id, applicationId!)).limit(1)
      if (!app) return { ok: false, error: "Application not found." }
      if (!(await isApplicationPaymentConfirmed(app))) {
        return { ok: false, error: "Payment is not confirmed. Reconcile the payment before approving." }
      }
      // Existing approval flow: creates/activates the member, runs referral rewards
      // and sends the confirmation email. Voting rights are left untouched.
      const res = await setApplicationStatus(app.id, "approved")
      if (!res.ok) return res
      const [member] = await db
        .select()
        .from(members)
        .where(and(isNull(members.deletedAt), sql`lower(${members.email}) = ${lower(app.email)}`))
        .limit(1)
      if (member && isIssuedMembership(member) && !(await getCurrentCertificate(member.id))) {
        try {
          await issueCertificate(member.id, actor.id)
          await logActivity(actor, "certificate.issue", { entityType: "member", entityId: member.id, target: member.name })
        } catch (err) {
          console.error("[membership-admin] certificate issue failed:", err)
        }
      }
      break
    }
    case "rejected": {
      if (needApp()) return needApp()!
      const res = await setApplicationStatus(applicationId!, "rejected")
      if (!res.ok) return res
      break
    }
    case "suspended": {
      if (!memberId) return { ok: false, error: "Only issued memberships can be suspended." }
      await setMemberStatus(memberId, "suspended")
      await logActivity(actor, "member.suspend", { entityType: "member", entityId: memberId })
      break
    }
  }
  revalidatePath("/admin/membership")
  return { ok: true }
}

// --- Confirmation email ------------------------------------------------------

export async function resendMembershipConfirmation(memberId: number): Promise<Result<{ delivered: boolean }>> {
  let actor: AdminActor
  try {
    actor = await requireManager()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }
  }
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1)
  if (!member || !isIssuedMembership(member)) return { ok: false, error: "Only approved memberships have a confirmation email." }
  if (member.status !== "active") return { ok: false, error: "The membership is not active." }

  let delivered = false
  let error = ""
  try {
    delivered = await sendTemplateEmail({
      to: member.email,
      key: "membership.approved",
      vars: { name: member.name, category: member.category, membershipId: member.membershipId },
    })
    if (!delivered) error = "Email delivery is not configured."
  } catch (err) {
    error = err instanceof Error ? err.message : "unknown error"
  }
  await logActivity(actor, "member.confirmation_resend", {
    entityType: "member",
    entityId: member.id,
    target: member.name,
    details: delivered ? `Confirmation sent to ${member.email}` : `Confirmation failed for ${member.email}: ${error}`,
  })
  revalidatePath("/admin/membership")
  if (!delivered) return { ok: false, error: `Confirmation email could not be sent: ${error}` }
  return { ok: true, delivered }
}

export async function issueMemberCertificate(memberId: number): Promise<Result> {
  let actor: AdminActor
  try {
    actor = await requireManager()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }
  }
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1)
  if (!member || !isIssuedMembership(member) || member.status !== "active") return { ok: false, error: "Certificates are only issued for active memberships." }
  await issueCertificate(member.id, actor.id)
  await logActivity(actor, "certificate.issue", { entityType: "member", entityId: member.id, target: member.name })
  revalidatePath("/admin/membership")
  return { ok: true }
}

// --- Verified email change ---------------------------------------------------

const EMAIL_CHANGE_TTL_MS = 48 * 60 * 60 * 1000
const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex")

/**
 * Starts an admin-initiated email correction. Nothing changes until the owner
 * of the new address opens the verification link, so an admin can never move
 * an account to an address nobody controls.
 */
export async function requestEmailChange(input: { applicationId: number | null; memberId: number | null; newEmail: string }): Promise<Result> {
  let actor: AdminActor
  try {
    actor = await requireManager()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }
  }
  const newEmail = lower(input.newEmail)
  if (!EMAIL_RE.test(newEmail) || newEmail.length > 254) return { ok: false, error: "Enter a valid email address." }

  const detail = await getMembershipCase({ applicationId: input.applicationId, memberId: input.memberId })
  if (!detail.ok) return detail
  const d = detail.detail
  const oldEmail = lower(d.loginUser?.email ?? d.member?.email ?? d.application?.email)
  if (!oldEmail) return { ok: false, error: "No current email found for this record." }
  if (newEmail === oldEmail) return { ok: false, error: "The new email is the same as the current one." }

  const [taken] = await db.select({ id: user.id }).from(user).where(sql`lower(${user.email}) = ${newEmail}`).limit(1)
  if (taken && taken.id !== d.loginUser?.id) {
    return { ok: false, error: "Another account already uses that email. Merge or remove that account first." }
  }
  const [memberTaken] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(isNull(members.deletedAt), sql`lower(${members.email}) = ${newEmail}`))
    .limit(1)
  if (memberTaken && memberTaken.id !== d.member?.id) {
    return { ok: false, error: "Another membership already uses that email." }
  }

  // Only one open request at a time per record.
  await db
    .update(emailChangeRequests)
    .set({ cancelledAt: new Date() })
    .where(
      and(
        isNull(emailChangeRequests.confirmedAt),
        isNull(emailChangeRequests.cancelledAt),
        or(
          d.application ? eq(emailChangeRequests.applicationId, d.application.id) : sql`false`,
          d.loginUser ? eq(emailChangeRequests.userId, d.loginUser.id) : sql`false`,
        ),
      ),
    )

  const token = crypto.randomBytes(32).toString("base64url")
  await db.insert(emailChangeRequests).values({
    userId: d.loginUser?.id ?? null,
    applicationId: d.application?.id ?? null,
    oldEmail,
    newEmail,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + EMAIL_CHANGE_TTL_MS),
    requestedBy: actor.id,
    requestedByName: actor.name,
  })

  const url = `${appBaseUrl()}/account/confirm-email?token=${encodeURIComponent(token)}`
  const email = brandedEmail({
    subject: "Confirm your new VAAP email address",
    heading: `Hello ${escapeHtml(d.summary.name || "there")},`,
    intro: [
      "The VAAP membership team is updating the email address on your account to this address.",
      "Please confirm that this inbox belongs to you. Your account will keep using your previous address until you confirm.",
    ],
    ctaLabel: "Confirm email address",
    ctaUrl: url,
    footnote: "This link expires in 48 hours. If you did not expect this, ignore this email and nothing will change.",
  })
  try {
    const sent = await sendEmail({ to: newEmail, subject: email.subject, html: email.html, text: email.text, templateKey: "account.email-change" })
    if (!sent) return { ok: false, error: "Email delivery is not configured, so the verification link could not be sent." }
  } catch (err) {
    return { ok: false, error: `Verification email could not be sent: ${err instanceof Error ? err.message : "unknown error"}` }
  }

  await logActivity(actor, "member.email_change_requested", {
    entityType: d.application ? "application" : "member",
    entityId: d.application?.id ?? d.member?.id ?? "",
    target: d.summary.name,
    details: `Requested email change ${oldEmail} → ${newEmail}; awaiting confirmation from the new address.`,
  })
  revalidatePath("/admin/membership")
  return { ok: true }
}

export async function cancelEmailChange(requestId: number): Promise<Result> {
  let actor: AdminActor
  try {
    actor = await requireManager()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }
  }
  const [req] = await db.select().from(emailChangeRequests).where(eq(emailChangeRequests.id, requestId)).limit(1)
  if (!req || req.confirmedAt) return { ok: false, error: "Request not found or already confirmed." }
  await db.update(emailChangeRequests).set({ cancelledAt: new Date() }).where(eq(emailChangeRequests.id, requestId))
  await logActivity(actor, "member.email_change_cancelled", {
    entityType: req.applicationId ? "application" : "member",
    entityId: req.applicationId ?? "",
    details: `Cancelled email change to ${req.newEmail}`,
  })
  revalidatePath("/admin/membership")
  return { ok: true }
}

// --- Audit feed --------------------------------------------------------------

export async function getMembershipAuditFeed(): Promise<Result<{ rows: { action: string; actorName: string; actorRole: string; target: string; details: string; createdAt: string }[] }>> {
  try {
    await requireManager()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Forbidden" }
  }
  const rows = await db
    .select()
    .from(auditLogs)
    .where(
      or(
        sql`${auditLogs.action} like 'payment.%'`,
        sql`${auditLogs.action} like 'application.%'`,
        sql`${auditLogs.action} like 'member.%'`,
        sql`${auditLogs.action} like 'certificate.%'`,
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(100)
  return {
    ok: true,
    rows: rows.map((r) => ({ action: r.action, actorName: r.actorName, actorRole: r.actorRole, target: r.target, details: r.details, createdAt: r.createdAt.toISOString() })),
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

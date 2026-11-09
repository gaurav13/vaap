import "server-only"
import { desc, inArray, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  emailSuppressions,
  members,
  membershipApplications,
  membershipCertificates,
  membershipInvitations,
  referralAttributions,
  user,
} from "@/lib/db/schema"

const DAY = 24 * 60 * 60 * 1000
export const INVITE_TOPIC = "membership-invitation"

/** Staff and admin accounts are internal and never counted as registered users. */
const INTERNAL_ROLES = new Set(["admin", "staff"])

export type RegisteredUserStatus = "not-subscribed" | "application-started" | "payment-pending"

export type RegisteredUser = {
  id: string
  name: string
  email: string
  registeredAt: Date
  emailVerified: boolean
  status: RegisteredUserStatus
  referralCode: string | null
  invitationsSent: number
  remindersSent: number
  lastInvitedAt: Date | null
  /** Stages already delivered, e.g. invitation, reminder-1. */
  sentStages: string[]
  suppressed: "unsubscribed" | "bounced" | null
}

export type PaymentStatus = "paid-card" | "paid-crypto" | "not-required" | "recorded-manually"
export type RenewalStatus = "current" | "due-soon" | "expired" | "renewal-pending" | "no-expiry"

export type PaidMember = {
  id: number
  userId: string | null
  name: string
  email: string
  membershipId: string
  plan: string
  status: string
  paymentStatus: PaymentStatus
  paymentMethod: string | null
  amount: string | null
  paymentDate: Date | null
  activatedAt: Date
  expiresAt: Date | null
  referralCode: string | null
  certificate: "issued" | "revoked" | "not-issued"
  renewal: RenewalStatus
}

const lower = (s: string | null | undefined) => (s ?? "").trim().toLowerCase()

/** An activated member record. Self-created "PENDING-" profile rows are not memberships. */
function isActivatedMember(m: { membershipId: string; deletedAt: Date | null }) {
  return !m.deletedAt && !m.membershipId.startsWith("PENDING-")
}

async function loadRaw() {
  const [users, memberRows, applications, attributions, invitations, suppressions] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt)),
    db.select().from(members).where(isNull(members.deletedAt)),
    db
      .select({
        id: membershipApplications.id,
        email: membershipApplications.email,
        status: membershipApplications.status,
        completed: membershipApplications.completed,
        category: membershipApplications.category,
        paymentMethod: membershipApplications.paymentMethod,
        totalAmount: membershipApplications.totalAmount,
        createdAt: membershipApplications.createdAt,
      })
      .from(membershipApplications)
      .orderBy(desc(membershipApplications.createdAt)),
    db
      .select({
        code: referralAttributions.code,
        memberEmail: referralAttributions.memberEmail,
        createdAt: referralAttributions.createdAt,
      })
      .from(referralAttributions)
      .orderBy(desc(referralAttributions.createdAt)),
    db.select().from(membershipInvitations).orderBy(desc(membershipInvitations.createdAt)),
    db
      .select({ email: emailSuppressions.email, topic: emailSuppressions.topic, reason: emailSuppressions.reason })
      .from(emailSuppressions)
      .where(inArray(emailSuppressions.topic, [INVITE_TOPIC, "all"])),
  ])
  return { users, memberRows, applications, attributions, invitations, suppressions }
}

type Raw = Awaited<ReturnType<typeof loadRaw>>

function firstBy<T>(rows: T[], key: (r: T) => string) {
  const map = new Map<string, T>()
  for (const r of rows) {
    const k = key(r)
    if (k && !map.has(k)) map.set(k, r)
  }
  return map
}

function buildRegistered(raw: Raw): RegisteredUser[] {
  const activatedByUser = new Set<string>()
  const activatedByEmail = new Set<string>()
  for (const m of raw.memberRows) {
    if (!isActivatedMember(m)) continue
    if (m.userId) activatedByUser.add(m.userId)
    activatedByEmail.add(lower(m.email))
  }
  const referralByEmail = firstBy(raw.attributions, (a) => lower(a.memberEmail))
  const suppressedByEmail = new Map<string, "unsubscribed" | "bounced">()
  for (const s of raw.suppressions) {
    const prev = suppressedByEmail.get(lower(s.email))
    suppressedByEmail.set(lower(s.email), prev === "bounced" || s.reason === "bounced" ? "bounced" : "unsubscribed")
  }
  const appsByEmail = new Map<string, Raw["applications"]>()
  for (const a of raw.applications) {
    const k = lower(a.email)
    appsByEmail.set(k, [...(appsByEmail.get(k) ?? []), a])
  }
  const invitesByEmail = new Map<string, Raw["invitations"]>()
  for (const i of raw.invitations) {
    if (i.status !== "sent") continue
    const k = lower(i.email)
    invitesByEmail.set(k, [...(invitesByEmail.get(k) ?? []), i])
  }

  return raw.users
    .filter((u) => !INTERNAL_ROLES.has(u.role) && !activatedByUser.has(u.id) && !activatedByEmail.has(lower(u.email)))
    .map((u) => {
      const email = lower(u.email)
      const apps = (appsByEmail.get(email) ?? []).filter((a) => a.status !== "rejected")
      const status: RegisteredUserStatus = apps.some((a) => a.completed && a.status === "pending")
        ? "payment-pending"
        : apps.some((a) => !a.completed)
          ? "application-started"
          : "not-subscribed"
      const sent = invitesByEmail.get(email) ?? []
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        registeredAt: u.createdAt,
        emailVerified: u.emailVerified,
        status,
        referralCode: referralByEmail.get(email)?.code ?? null,
        invitationsSent: sent.length,
        remindersSent: sent.filter((i) => i.stage !== "invitation").length,
        lastInvitedAt: sent[0]?.createdAt ?? null,
        sentStages: [...new Set(sent.map((i) => i.stage))],
        suppressed: suppressedByEmail.get(email) ?? null,
      }
    })
}

function buildPaid(raw: Raw, now: Date): PaidMember[] {
  const referralByEmail = firstBy(raw.attributions, (a) => lower(a.memberEmail))
  const approvedByEmail = firstBy(
    raw.applications.filter((a) => a.status === "approved" && a.completed),
    (a) => lower(a.email),
  )
  const pendingByEmail = firstBy(
    raw.applications.filter((a) => a.status === "pending" && a.completed),
    (a) => lower(a.email),
  )
  return raw.memberRows
    .filter(isActivatedMember)
    .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
    .map((m) => {
      const email = lower(m.email)
      const app = approvedByEmail.get(email)
      const paymentStatus: PaymentStatus = !app
        ? "recorded-manually"
        : app.paymentMethod === "card"
          ? "paid-card"
          : app.paymentMethod === "crypto"
            ? "paid-crypto"
            : "not-required"
      const expired = m.status === "expired" || (m.expiresAt !== null && m.expiresAt < now)
      const renewalPending = pendingByEmail.get(email)
      const renewal: RenewalStatus = renewalPending && renewalPending.createdAt > m.joinedAt
        ? "renewal-pending"
        : expired
          ? "expired"
          : !m.expiresAt
            ? "no-expiry"
            : m.expiresAt.getTime() - now.getTime() <= 30 * DAY
              ? "due-soon"
              : "current"
      return {
        id: m.id,
        userId: m.userId,
        name: m.name,
        email: m.email,
        membershipId: m.membershipId,
        plan: m.category,
        status: expired ? "expired" : m.status,
        paymentStatus,
        paymentMethod: app?.paymentMethod ?? null,
        amount: app?.totalAmount ?? null,
        paymentDate: app?.createdAt ?? null,
        activatedAt: m.joinedAt,
        expiresAt: m.expiresAt,
        referralCode: referralByEmail.get(email)?.code ?? null,
        certificate: "not-issued" as const,
        renewal,
      }
    })
}

/** Registered website accounts that have never activated a paid membership. */
export async function getRegisteredUsers() {
  return buildRegistered(await loadRaw())
}

/** Registered users that may receive invitation emails right now. */
export function isInvitable(u: RegisteredUser) {
  return u.status !== "payment-pending" && !u.suppressed
}

export async function getMembershipFunnel() {
  const now = new Date()
  const raw = await loadRaw()
  const registered = buildRegistered(raw)
  const paid = buildPaid(raw, now)

  if (paid.length) {
    const certs = await db
      .select({ memberId: membershipCertificates.memberId, status: membershipCertificates.status })
      .from(membershipCertificates)
      .where(inArray(membershipCertificates.memberId, paid.map((p) => p.id)))
      .orderBy(desc(membershipCertificates.issuedAt))
    const byMember = firstBy(certs, (c) => String(c.memberId))
    for (const p of paid) {
      const c = byMember.get(String(p.id))
      p.certificate = c ? (c.status === "revoked" ? "revoked" : "issued") : "not-issued"
    }
  }

  const accounts = raw.users.filter((u) => !INTERNAL_ROLES.has(u.role))
  const sentInvites = raw.invitations.filter((i) => i.status === "sent")
  const firstInviteByEmail = new Map<string, Date>()
  for (const i of sentInvites) firstInviteByEmail.set(lower(i.email), i.createdAt) // ordered newest first → ends on oldest

  const activatedByEmail = new Map<string, Date>()
  for (const m of raw.memberRows) if (isActivatedMember(m)) activatedByEmail.set(lower(m.email), m.joinedAt)
  const submittedEmails = new Set(raw.applications.filter((a) => a.completed).map((a) => lower(a.email)))

  let conversions = 0
  let invitedThenPaid = 0
  for (const [email, firstInvite] of firstInviteByEmail) {
    if (submittedEmails.has(email)) invitedThenPaid++
    const joined = activatedByEmail.get(email)
    if (joined && joined > firstInvite) conversions++
  }

  const stats = {
    totalRegistered: accounts.length,
    activePaid: paid.filter((p) => p.status === "active").length,
    unpaidRegistered: registered.length,
    pendingPayments: raw.applications.filter((a) => a.completed && a.status === "pending").length,
    expired: paid.filter((p) => p.status === "expired").length,
    invitationsSent: sentInvites.length,
    failedInvitations: raw.invitations.filter((i) => i.status === "failed").length,
    conversions,
  }

  const funnel = [
    { key: "registered", label: "Registered users", value: accounts.length },
    { key: "invited", label: "Invited", value: firstInviteByEmail.size },
    { key: "payment", label: "Payment submitted", value: invitedThenPaid },
    { key: "verified", label: "Verified paid members", value: conversions },
  ]

  const nameByEmail = new Map(raw.users.map((u) => [lower(u.email), u.name]))
  const history = raw.invitations.slice(0, 300).map((i) => ({
    id: i.id,
    name: nameByEmail.get(lower(i.email)) ?? "",
    email: i.email,
    stage: i.stage,
    trigger: i.trigger,
    status: i.status,
    error: i.error,
    actor: i.actor,
    createdAt: i.createdAt,
    converted: (activatedByEmail.get(lower(i.email)) ?? new Date(0)) > i.createdAt,
  }))

  return { stats, funnel, registered, paid, history }
}

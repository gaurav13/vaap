import "server-only"
import { cache } from "react"
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
import { isIssuedMembership, syncCardPaymentVerifications } from "@/lib/membership-state"
import { isPaymentConfirmed } from "@/lib/rbac"

const DAY = 24 * 60 * 60 * 1000
export const INVITE_TOPIC = "membership-invitation"

/** Staff and admin accounts are internal and never counted as registered users. */
const INTERNAL_ROLES = new Set(["admin", "manager", "staff"])

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

// Deduplicated per request: the dashboard needs both the funnel and the directory.
const loadRaw = cache(async function loadRaw() {
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
        txid: membershipApplications.txid,
        invitationCode: membershipApplications.invitationCode,
        paymentVerifiedAt: membershipApplications.paymentVerifiedAt,
        reference: membershipApplications.reference,
        organization: membershipApplications.organization,
        createdAt: membershipApplications.createdAt,
      })
      .from(membershipApplications)
      .orderBy(desc(membershipApplications.createdAt))
      .then(syncCardPaymentVerifications),
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
})

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

export type MemberStage = "incomplete" | "not-paid" | "pending-approval" | "active" | "expired" | "suspended"

export type DirectoryRow = {
  key: string
  userId: string | null
  /** Issued member record, when one exists. */
  memberId: number | null
  name: string
  email: string
  organization: string | null
  category: string | null
  stage: MemberStage
  /**
   * Started an application (draft, abandoned, stopped at payment, or submitted)
   * without a verified payment. Independent of `stage`, which tracks progress.
   */
  notPaid: boolean
  payment: "not-started" | "unpaid" | "verified" | "not-required"
  application: "not-started" | "draft" | "submitted" | "approved" | "rejected" | "manual"
  applicationReference: string | null
  paymentMethod: string | null
  amount: string | null
  registeredAt: Date
  submittedAt: Date | null
  expiresAt: Date | null
  emailVerified: boolean | null
}

export type StageStats = {
  totalRegistered: number
  incomplete: number
  notPaid: number
  pendingApproval: number
  activePaid: number
  expired: number
}

type RawApp = Raw["applications"][number]
const isNoFee = (a: RawApp) => a.totalAmount === "No payment required" || Boolean(a.invitationCode)

/**
 * One row per person (account or issued member record, deduplicated by user id
 * and email), classified into a single stage. This is the shared logic behind
 * every membership count and filter in the admin area.
 */
function buildDirectory(raw: Raw, now: Date): DirectoryRow[] {
  const issued = raw.memberRows
    .filter((m) => isIssuedMembership(m))
    .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
  const memberByUser = firstBy(issued, (m) => m.userId ?? "")
  const memberByEmail = firstBy(issued, (m) => lower(m.email))
  const appsByEmail = new Map<string, RawApp[]>()
  for (const a of raw.applications) {
    const k = lower(a.email)
    appsByEmail.set(k, [...(appsByEmail.get(k) ?? []), a])
  }

  const usedMembers = new Set<number>()
  const seenEmails = new Set<string>()

  const fromMember = (m: (typeof issued)[number]) => {
    const app = (appsByEmail.get(lower(m.email)) ?? []).find((a) => a.completed && a.status === "approved")
    const expired = m.status === "expired" || (m.expiresAt !== null && m.expiresAt < now)
    return {
      memberId: m.id,
      category: m.category,
      organization: m.organization,
      stage: (expired ? "expired" : m.status === "suspended" ? "suspended" : "active") as MemberStage,
      notPaid: false,
      payment: (!app ? "verified" : isNoFee(app) ? "not-required" : "verified") as DirectoryRow["payment"],
      application: (app ? "approved" : "manual") as DirectoryRow["application"],
      applicationReference: app?.reference ?? null,
      paymentMethod: app?.paymentMethod ?? null,
      amount: app?.totalAmount ?? null,
      submittedAt: app?.createdAt ?? null,
      expiresAt: m.expiresAt,
    }
  }

  const rows: DirectoryRow[] = []
  for (const u of raw.users) {
    if (INTERNAL_ROLES.has(u.role)) continue
    const email = lower(u.email)
    if (seenEmails.has(email)) continue
    seenEmails.add(email)
    const member = memberByUser.get(u.id) ?? memberByEmail.get(email)
    const base = { key: `u-${u.id}`, userId: u.id, name: u.name, email: u.email, registeredAt: u.createdAt, emailVerified: u.emailVerified }
    if (member) {
      usedMembers.add(member.id)
      rows.push({ ...base, ...fromMember(member) })
      continue
    }
    const apps = appsByEmail.get(email) ?? []
    const submitted = apps.filter((a) => a.completed && a.status === "pending")
    const paid = submitted.find((a) => isPaymentConfirmed(a))
    const app = paid ?? submitted[0] ?? apps.find((a) => !a.completed && a.status !== "rejected") ?? apps[0]
    const stage: MemberStage = paid ? "pending-approval" : submitted.length ? "not-paid" : "incomplete"
    rows.push({
      ...base,
      memberId: null,
      category: app?.category ?? null,
      organization: app?.organization ?? null,
      stage,
      notPaid: !paid && apps.some((a) => a.status !== "rejected" && a.status !== "approved"),
      payment: !app || !app.completed ? "not-started" : paid ? (isNoFee(paid) ? "not-required" : "verified") : "unpaid",
      application: !app
        ? "not-started"
        : app.status === "rejected"
          ? "rejected"
          : app.status === "approved"
            ? "approved"
            : app.completed
              ? "submitted"
              : "draft",
      applicationReference: app?.reference ?? null,
      paymentMethod: app?.paymentMethod ?? null,
      amount: app?.totalAmount ?? null,
      submittedAt: app?.completed ? app.createdAt : null,
      expiresAt: null,
    })
  }

  // Issued members without a website account (imported or added by an admin).
  for (const m of issued) {
    if (usedMembers.has(m.id) || seenEmails.has(lower(m.email))) continue
    seenEmails.add(lower(m.email))
    rows.push({
      key: `m-${m.id}`,
      userId: m.userId,
      name: m.name,
      email: m.email,
      registeredAt: m.joinedAt,
      emailVerified: null,
      ...fromMember(m),
    })
  }

  return rows.sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime())
}

export function stageStats(rows: DirectoryRow[]): StageStats {
  const by = (s: MemberStage) => rows.filter((r) => r.stage === s).length
  return {
    totalRegistered: rows.length,
    incomplete: by("incomplete"),
    notPaid: rows.filter((r) => r.notPaid).length,
    pendingApproval: by("pending-approval"),
    activePaid: by("active"),
    expired: by("expired"),
  }
}

/** Every registered person with their membership stage, plus the matching counts. */
export async function getMemberDirectory() {
  const rows = buildDirectory(await loadRaw(), new Date())
  return { rows, stats: stageStats(rows) }
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

  const stages = stageStats(buildDirectory(raw, now))
  const stats = {
    totalRegistered: accounts.length,
    activePaid: paid.filter((p) => p.status === "active").length,
    unpaidRegistered: registered.length,
    // Submitted but payment not yet verified; verified-and-awaiting-approval is `stages.pendingApproval`.
    pendingPayments: stages.notPaid,
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

  return { stats, stages, funnel, registered, paid, history }
}

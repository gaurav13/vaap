"use server"

import { db } from "@/lib/db"
import { EVENT_CATEGORIES, EVENT_CITIES, EVENT_FORMATS, pickOption } from "@/lib/event-options"
import { normalizeUrl } from "@/lib/news-options"
import {
  news,
  events,
  membershipApplications,
  contactMessages,
  contactMessageReplies,
  user,
  members,
  account,
  referralPartners,
  session as sessionTable,
  auditLogs,
} from "@/lib/db/schema"
import { canSeeContacts, HIDDEN, isPaymentConfirmed, logActivity, requireOperator, requireSuperAdmin, saveRevision } from "@/lib/rbac"
import { brandedEmail, sendEmail } from "@/lib/mailer"
import { getSession } from "@/lib/session"
import { auth } from "@/lib/auth"
import { computeExpiry } from "@/lib/membership"
import { processMembershipApproval } from "@/lib/referral-engine"
import { canOwnReferralCode } from "@/lib/permissions"
import { isVerifiedKolUser } from "@/lib/kol"
import { notify, notifyCommunity } from "@/lib/notifications"
import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { isApplicationPaymentConfirmed, isIssuedMembership, syncCardPaymentVerifications } from "@/lib/membership-state"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { announceEventIfEnabled } from "@/lib/email-automations/engine"
import { uniqueEventSlug } from "@/lib/event-slug-server"

// Staff and Super Admins: daily operations (content, approvals, messages).
const requireStaff = requireOperator
// Super Admin only: deletes, payments, users, roles.
const requireAdmin = requireSuperAdmin

// Applicant fields a Staff user must never receive (contact, identity, payment trail).
const SENSITIVE_APPLICATION_FIELD = /^(email|phone|cnic|registrationNumber|website)$|tx|hash|wallet|address/i

function maskApplication<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row }
  for (const key of Object.keys(out)) {
    if (SENSITIVE_APPLICATION_FIELD.test(key) && out[key]) out[key] = HIDDEN
  }
  return out as T
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

// --- News ------------------------------------------------------------------

function readPublisher(formData: FormData) {
  const publisherName = String(formData.get("publisherName") ?? "").trim().slice(0, 80)
  const publisherLogo = String(formData.get("publisherLogo") ?? "").trim() || null
  const rawUrl = String(formData.get("externalUrl") ?? "").trim()
  const externalUrl = normalizeUrl(rawUrl)
  const sourceType = formData.get("sourceType") === "external" ? "external" : "original"
  const rawDate = String(formData.get("originalPublishedAt") ?? "").trim()
  const parsedDate = rawDate ? new Date(`${rawDate}T00:00:00Z`) : null
  const originalPublishedAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null
  const base = { publisherName, publisherLogo, externalUrl, sourceType, originalPublishedAt }
  if (rawUrl && !externalUrl) {
    return { ...base, externalUrl: null, error: "Article link must be a valid http(s) URL." }
  }
  if (sourceType === "external" && (!publisherName || !externalUrl)) {
    return { ...base, error: "External publisher articles need a publisher name and original article URL." }
  }
  return { ...base, error: null as string | null }
}

export async function createNews(formData: FormData) {
  const author = await requireStaff()
  const title = String(formData.get("title") ?? "").trim()
  const category = String(formData.get("category") ?? "Industry Update")
  const excerpt = String(formData.get("excerpt") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const image = String(formData.get("image") ?? "").trim()
  const committeeRaw = String(formData.get("committeeId") ?? "").trim()
  const committeeId = committeeRaw ? Number.parseInt(committeeRaw, 10) : null
  const published = formData.get("published") === "on"
  const publisher = readPublisher(formData)

  if (!title) return { ok: false, error: "Title is required." }
  if (publisher.error) return { ok: false, error: publisher.error }

  const [createdNews] = await db.insert(news).values({
    title,
    category,
    excerpt,
    content,
    image: image || null,
    publisherName: publisher.publisherName,
    publisherLogo: publisher.publisherLogo,
    externalUrl: publisher.externalUrl,
    sourceType: publisher.sourceType,
    originalPublishedAt: publisher.originalPublishedAt,
    committeeId: committeeId && !Number.isNaN(committeeId) ? committeeId : null,
    published,
    authorId: author.id,
  }).returning({ id: news.id })
  await logActivity(author, "news.create", { entityType: "news", entityId: createdNews?.id, target: title })
  if (published) {
    await notifyCommunity({
      type: publisher.sourceType === "external" ? "media" : "news",
      title: publisher.sourceType === "external" ? "New media coverage" : "Latest news",
      body: title,
      link: "/news",
    })
  }
  revalidatePath("/admin/news")
  revalidatePath("/news")
  revalidatePath("/working-groups")
  revalidatePath("/")
  return { ok: true }
}

export async function updateNews(id: number, formData: FormData) {
  const actor = await requireStaff()
  const title = String(formData.get("title") ?? "").trim()
  const category = String(formData.get("category") ?? "Industry Update")
  const excerpt = String(formData.get("excerpt") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const image = String(formData.get("image") ?? "").trim()
  const committeeRaw = String(formData.get("committeeId") ?? "").trim()
  const committeeId = committeeRaw ? Number.parseInt(committeeRaw, 10) : null
  const published = formData.get("published") === "on"
  const publisher = readPublisher(formData)

  if (!title) return { ok: false, error: "Title is required." }
  if (publisher.error) return { ok: false, error: publisher.error }

  const [before] = await db.select().from(news).where(eq(news.id, id)).limit(1)
  if (!before) return { ok: false, error: "News post not found." }
  await saveRevision(actor, "news", id, before)
  await logActivity(actor, "news.update", {
    entityType: "news",
    entityId: id,
    target: title,
    details: before.published !== published ? (published ? "Published" : "Unpublished") : "",
  })

  await db
    .update(news)
    .set({
      title,
      category,
      excerpt,
      content,
      image: image || null,
      publisherName: publisher.publisherName,
      publisherLogo: publisher.publisherLogo,
      externalUrl: publisher.externalUrl,
      sourceType: publisher.sourceType,
      originalPublishedAt: publisher.originalPublishedAt,
      committeeId: committeeId && !Number.isNaN(committeeId) ? committeeId : null,
      published,
    })
    .where(eq(news.id, id))
  revalidatePath("/admin/news")
  revalidatePath("/news")
  revalidatePath("/working-groups")
  revalidatePath("/")
  return { ok: true }
}

export async function deleteNews(id: number) {
  const actor = await requireAdmin()
  const [before] = await db.select().from(news).where(eq(news.id, id)).limit(1)
  await saveRevision(actor, "news", id, before, "delete")
  await db.delete(news).where(eq(news.id, id))
  await logActivity(actor, "news.delete", { entityType: "news", entityId: id, target: before?.title ?? "" })
  revalidatePath("/admin/news")
  revalidatePath("/news")
  revalidatePath("/working-groups")
  revalidatePath("/")
}

// --- Events ----------------------------------------------------------------

// Runs after the response so admins are not blocked while members are emailed.
function scheduleEventAnnouncement(eventId: number) {
  after(async () => {
    try {
      await announceEventIfEnabled(eventId)
    } catch (err) {
      console.error("[email-automation] event announcement failed:", err)
    }
  })
}

export async function createEvent(formData: FormData) {
  const actor = await requireStaff()
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const location = String(formData.get("location") ?? "").trim()
  const timeLabel = String(formData.get("timeLabel") ?? "").trim()
  const hostName = String(formData.get("hostName") ?? "").trim()
  const coverImage = String(formData.get("coverImage") ?? "").trim()
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim()
  const published = formData.get("published") === "on"
  const category = pickOption(EVENT_CATEGORIES, formData.get("category"))
  const city = pickOption(EVENT_CITIES, formData.get("city"))
  const format = pickOption(EVENT_FORMATS, formData.get("format"))

  if (!title) return { ok: false, error: "Title is required." }

  // Admin-created events are approved by default.
  const [created] = await db.insert(events).values({
    title,
    slug: await uniqueEventSlug(title),
    description,
    location,
    timeLabel,
    category,
    city,
    format,
    hostName,
    coverImage: coverImage || null,
    startsAt: startsAtRaw ? new Date(startsAtRaw) : new Date(),
    published,
    status: "approved",
  }).returning({ id: events.id })
  await logActivity(actor, "event.create", { entityType: "event", entityId: created.id, target: title })
  if (published) {
    scheduleEventAnnouncement(created.id)
    await notifyCommunity({ type: "event", title: "New event announced", body: title, link: "/events" })
  }
  revalidatePath("/admin/events")
  revalidatePath("/events")
  revalidatePath("/")
  return { ok: true }
}

export async function updateEvent(id: number, formData: FormData) {
  const actor = await requireStaff()
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const location = String(formData.get("location") ?? "").trim()
  const timeLabel = String(formData.get("timeLabel") ?? "").trim()
  const hostName = String(formData.get("hostName") ?? "").trim()
  const coverImage = String(formData.get("coverImage") ?? "").trim()
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim()
  const published = formData.get("published") === "on"
  const category = pickOption(EVENT_CATEGORIES, formData.get("category"))
  const city = pickOption(EVENT_CITIES, formData.get("city"))
  const format = pickOption(EVENT_FORMATS, formData.get("format"))

  if (!title) return { ok: false, error: "Title is required." }
  const [before] = await db.select().from(events).where(eq(events.id, id)).limit(1)
  if (!before) return { ok: false, error: "Event not found." }
  await saveRevision(actor, "event", id, before)
  await logActivity(actor, "event.update", { entityType: "event", entityId: id, target: title })

  await db
    .update(events)
    .set({
      title,
      slug: await uniqueEventSlug(title, id),
      description,
      location,
      timeLabel,
      category,
      city,
      format,
      hostName,
      coverImage: coverImage || null,
      ...(startsAtRaw ? { startsAt: new Date(startsAtRaw) } : {}),
      published,
    })
    .where(eq(events.id, id))
  // Already-announced members are skipped by the dedupe ledger.
  if (published) scheduleEventAnnouncement(id)
  revalidatePath("/admin/events")
  revalidatePath("/events")
  revalidatePath("/")
  return { ok: true }
}

export async function setEventStatus(id: number, status: "approved" | "pending" | "rejected") {
  const actor = await requireStaff()
  if (!["approved", "pending", "rejected"].includes(status)) return { ok: false, error: "Invalid status." }
  const [before] = await db.select({ title: events.title }).from(events).where(eq(events.id, id)).limit(1)
  if (!before) return { ok: false, error: "Event not found." }
  await db.update(events).set({ status }).where(eq(events.id, id))
  await logActivity(actor, `event.${status === "pending" ? "reopen" : status === "approved" ? "approve" : "reject"}`, {
    entityType: "event",
    entityId: id,
    target: before.title,
  })
  if (status === "approved") scheduleEventAnnouncement(id)
  revalidatePath("/admin/events")
  revalidatePath("/events")
  revalidatePath("/")
  return { ok: true }
}

export async function deleteEvent(id: number) {
  const actor = await requireAdmin()
  const [before] = await db.select().from(events).where(eq(events.id, id)).limit(1)
  await saveRevision(actor, "event", id, before, "delete")
  await db.delete(events).where(eq(events.id, id))
  await logActivity(actor, "event.delete", { entityType: "event", entityId: id, target: before?.title ?? "" })
  revalidatePath("/admin/events")
  revalidatePath("/events")
  revalidatePath("/")
}

// --- Membership applications ----------------------------------------------

export async function getApplications() {
  const actor = await requireStaff()
  const rows = await syncCardPaymentVerifications(
    await db.select().from(membershipApplications).orderBy(desc(membershipApplications.createdAt)),
  )
  return rows.map((row) => {
    const withPayment = { ...row, paymentConfirmed: isPaymentConfirmed(row) }
    return canSeeContacts(actor) ? withPayment : maskApplication(withPayment)
  })
}

export async function setApplicationStatus(
  id: number,
  status: "pending" | "approved" | "rejected",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await requireStaff()
  if (!["pending", "approved", "rejected"].includes(status)) return { ok: false, error: "Invalid status." }
  const [current] = await db.select().from(membershipApplications).where(eq(membershipApplications.id, id)).limit(1)
  if (!current) return { ok: false, error: "Application not found." }
  // Nobody, Super Admin included, can approve before payment is verified server-side.
  if (status === "approved" && !(await isApplicationPaymentConfirmed(current))) {
    return { ok: false, error: "Payment is not confirmed yet. Approval is only possible after payment is verified." }
  }
  // Staff may only decide on applications whose payment the system has confirmed.
  if (actor.role !== "admin" && status !== "pending" && !isPaymentConfirmed(current)) {
    return { ok: false, error: "Payment is not confirmed yet. A Super Admin must verify payment before this can be decided." }
  }
  await db.update(membershipApplications).set({ status }).where(eq(membershipApplications.id, id))
  await logActivity(actor, `application.${status === "pending" ? "reopen" : status === "approved" ? "approve" : "reject"}`, {
    entityType: "application",
    entityId: id,
    target: `${current.name} · ${current.category}`,
  })

  // Notify the applicant of the status change (email + in-app if they have an
  // account). Approval details are enriched further down after promotion.
  const [statusApp] = await db
    .select({ name: membershipApplications.name, email: membershipApplications.email })
    .from(membershipApplications)
    .where(eq(membershipApplications.id, id))
    .limit(1)

  if (statusApp) {
    if (status === "rejected") {
      await notify({
        email: statusApp.email,
        type: "membership",
        title: "Update on your membership application",
        body: "After review, your membership application was not approved at this time. Please contact us if you'd like more information.",
        link: "/dashboard/applications",
        emailKey: "application.rejected",
        emailVars: { name: statusApp.name },
      })
    } else if (status === "pending") {
      await notify({
        email: statusApp.email,
        type: "membership",
        title: "Your application is under review",
        body: "Your membership application status is now 'under review'. We'll update you once a decision is made.",
        link: "/dashboard/applications",
      })
    }
    // The "approved" case is notified below, after the member record and
    // membership ID are created, so the email can include those details.
  }

  // Approving an application promotes the applicant to an active member record.
  // Idempotent: skip if a member with the same email already exists.
  if (status === "approved") {
    const [application] = await db
      .select()
      .from(membershipApplications)
      .where(eq(membershipApplications.id, id))
      .limit(1)

    if (application) {
      const [existing] = await db
        .select()
        .from(members)
        .where(sql`lower(${members.email}) = ${application.email.toLowerCase()}`)
        .limit(1)
      // Link the member row to the applicant's account so their dashboard finds it.
      const [account_] = await db
        .select({ id: user.id })
        .from(user)
        .where(sql`lower(${user.email}) = ${application.email.toLowerCase()}`)
        .limit(1)
      const linkedUserId = existing?.userId ?? account_?.id ?? null
      const membershipId = application.reference ?? `VAAP-${new Date().getFullYear()}-${String(id).padStart(6, "0")}`
      // Membership term begins at approval and runs one year (365 days).
      const now = new Date()
      const expiresAt = computeExpiry(now)
      if (existing) {
        // Promote a self-created "pending" profile row (or re-activate an
        // existing member) instead of skipping — otherwise self-serve profiles
        // could never be approved because a row with this email already exists.
        const firstActivation = existing.membershipId.startsWith("PENDING-")
        await db
          .update(members)
          .set({
            status: "active",
            goodStanding: true,
            // A newly approved application supersedes an earlier soft delete;
            // left set, the member dashboard would ignore the activated row.
            deletedAt: null,
            userId: linkedUserId,
            category: application.category,
            membershipId: firstActivation ? membershipId : existing.membershipId,
            organization: existing.organization ?? application.organization,
            // Start the term at first activation; extend it on renewal approval.
            ...(firstActivation ? { joinedAt: now } : {}),
            expiresAt,
          })
          .where(eq(members.id, existing.id))
      } else {
        await db.insert(members).values({
          userId: linkedUserId,
          membershipId,
          name: application.name,
          email: application.email,
          organization: application.organization,
          ntn: application.registrationNumber,
          designation: application.designation,
          phone: application.phone,
          website: application.website,
          category: application.category,
          status: "active",
          joinedAt: now,
          expiresAt,
        })
      }
      revalidatePath("/members")
      revalidatePath("/admin/members")

      // Referral reward eligibility fires ONLY here — on official approval of a
      // referred membership. Never on click / register / submit / partial pay.
      try {
        await processMembershipApproval({
          email: application.email,
          membershipId,
          category: application.category,
          referrerNameLookup: async (userId, partnerId) => {
            if (userId) {
              const [u] = await db
                .select({ name: user.name, role: user.role })
                .from(user)
                .where(eq(user.id, userId))
                .limit(1)
              // Verified KOLs earn under the "kol" commission rules, not the base member role.
          if (u && !canOwnReferralCode(u.role) && (await isVerifiedKolUser(userId))) {
            return { name: u.name ?? "", role: "kol" }
          }
          return { name: u?.name ?? "", role: u?.role ?? "staff" }
            }
            if (partnerId) {
              const [p] = await db
                .select({ name: referralPartners.name })
                .from(referralPartners)
                .where(eq(referralPartners.id, partnerId))
                .limit(1)
              return { name: p?.name ?? "", role: "kol" }
            }
            return { name: "", role: "staff" }
          },
        })
        revalidatePath("/admin/referrals/rewards")
      } catch (err) {
        // A referral-engine failure must never block membership approval.
        console.log("[v0] reward engine error on approval:", err instanceof Error ? err.message : err)
      }

      await notify({
        email: application.email,
        type: "membership",
        title: "Your membership is approved",
        body: `Congratulations! Your ${application.category} membership (${membershipId}) is now active. Welcome to VAAP.`,
        link: "/dashboard/membership",
        emailKey: "membership.approved",
        emailVars: { name: application.name, category: application.category, membershipId },
      })
    }
  }

  revalidatePath("/admin/applications")
  return { ok: true }
}

/** Super Admin confirms a manual (crypto) payment after checking it on-chain. */
export async function verifyApplicationPayment(id: number, verified: boolean) {
  const actor = await requireAdmin()
  const [app] = await db.select().from(membershipApplications).where(eq(membershipApplications.id, id)).limit(1)
  if (!app) return { ok: false, error: "Application not found." }
  await db
    .update(membershipApplications)
    .set({ paymentVerifiedAt: verified ? new Date() : null, paymentVerifiedBy: verified ? actor.id : null })
    .where(eq(membershipApplications.id, id))
  await logActivity(actor, verified ? "payment.verify" : "payment.unverify", {
    entityType: "application",
    entityId: id,
    target: app.name,
  })
  revalidatePath("/admin/applications")
  return { ok: true }
}

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000

/** Fixed-template payment reminder. Staff never see or edit the recipient address. */
export async function sendPaymentReminder(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await requireStaff()
  const [app] = await db.select().from(membershipApplications).where(eq(membershipApplications.id, id)).limit(1)
  if (!app) return { ok: false, error: "Application not found." }
  if (isPaymentConfirmed(app)) return { ok: false, error: "Payment is already confirmed for this application." }
  if (app.status !== "pending") return { ok: false, error: "Reminders can only be sent for pending applications." }

  const [recent] = await db
    .select({ createdAt: auditLogs.createdAt })
    .from(auditLogs)
    .where(and(eq(auditLogs.action, "application.payment_reminder"), eq(auditLogs.entityId, String(id))))
    .orderBy(desc(auditLogs.createdAt))
    .limit(1)
  if (recent && Date.now() - recent.createdAt.getTime() < REMINDER_COOLDOWN_MS) {
    return { ok: false, error: "A reminder was already sent in the last 24 hours." }
  }

  const email = brandedEmail({
    subject: "Complete your VAAP membership payment",
    heading: `Dear ${escapeHtml(app.name)},`,
    intro: [
      `Thank you for applying for <strong>${escapeHtml(app.category)}</strong> membership with VAAP.`,
      "We have not yet been able to confirm your membership payment. Please sign in to your dashboard to complete payment so the team can review your application.",
    ],
    ctaLabel: "Complete payment",
    ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://vaap.org.pk"}/dashboard/applications`,
    footnote: "If you have already paid, please reply to this email with your payment reference and we will confirm it.",
  })
  try {
    await sendEmail({ to: app.email, subject: email.subject, html: email.html, templateKey: "payment-reminder" })
  } catch (err) {
    return { ok: false, error: `Reminder could not be sent: ${err instanceof Error ? err.message : "unknown error"}` }
  }
  await logActivity(actor, "application.payment_reminder", { entityType: "application", entityId: id, target: app.name })
  return { ok: true }
}

// Super-admin deletes an application record. Only permitted for applications
// that are rejected, or incomplete (never completed the payment stage). This
// guards against accidental removal of pending or approved applications.
export async function deleteApplication(id: number) {
  const actor = await requireAdmin()
  await logActivity(actor, "application.delete", { entityType: "application", entityId: id })

  const [application] = await db
    .select({
      id: membershipApplications.id,
      status: membershipApplications.status,
      completed: membershipApplications.completed,
    })
    .from(membershipApplications)
    .where(eq(membershipApplications.id, id))
    .limit(1)

  if (!application) {
    return { ok: false, error: "Application not found." }
  }

  const isRejected = application.status === "rejected"
  const isIncomplete = !application.completed
  if (!isRejected && !isIncomplete) {
    return { ok: false, error: "Only rejected or incomplete applications can be deleted." }
  }

  await db.delete(membershipApplications).where(eq(membershipApplications.id, id))
  revalidatePath("/admin/applications")
  return { ok: true }
}

// --- Contact messages ------------------------------------------------------

export async function getContactMessages() {
  const actor = await requireStaff()
  const rows = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt))
  if (canSeeContacts(actor)) return rows
  return rows.map((m) => ({ ...m, email: HIDDEN, phone: m.phone ? HIDDEN : null }))
}

export type MessageStatus = "pending" | "in_progress" | "resolved"
const MESSAGE_STATUSES: MessageStatus[] = ["pending", "in_progress", "resolved"]

export async function setMessageStatus(id: number, status: MessageStatus) {
  const actor = await requireStaff()
  if (!MESSAGE_STATUSES.includes(status)) return { ok: false, error: "Invalid status." }
  const [msg] = await db.select({ subject: contactMessages.subject }).from(contactMessages).where(eq(contactMessages.id, id)).limit(1)
  if (!msg) return { ok: false, error: "Message not found." }
  await db.update(contactMessages).set({ status, handled: status === "resolved" }).where(eq(contactMessages.id, id))
  await logActivity(actor, "message.status", { entityType: "message", entityId: id, target: msg.subject, details: status })
  revalidatePath("/admin/messages")
  revalidatePath("/admin")
  return { ok: true }
}

export async function setMessageHandled(id: number, handled: boolean) {
  return setMessageStatus(id, handled ? "resolved" : "pending")
}

/** Staff and Super Admins a message can be assigned to (names only). */
export async function getAssignableOperators() {
  await requireStaff()
  return db
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .where(sql`${user.role} in ('staff', 'admin')`)
    .orderBy(user.name)
}

export async function assignMessage(id: number, assigneeId: string | null) {
  const actor = await requireStaff()
  let assigneeName = ""
  if (assigneeId) {
    const [assignee] = await db.select({ name: user.name, role: user.role }).from(user).where(eq(user.id, assigneeId)).limit(1)
    if (!assignee || (assignee.role !== "staff" && assignee.role !== "manager" && assignee.role !== "admin")) return { ok: false, error: "Choose a staff member." }
    assigneeName = assignee.name ?? ""
  }
  const [msg] = await db.select({ subject: contactMessages.subject, status: contactMessages.status }).from(contactMessages).where(eq(contactMessages.id, id)).limit(1)
  if (!msg) return { ok: false, error: "Message not found." }
  await db
    .update(contactMessages)
    .set({
      assignedToId: assigneeId,
      assignedToName: assigneeName,
      ...(assigneeId && msg.status === "pending" ? { status: "in_progress" } : {}),
    })
    .where(eq(contactMessages.id, id))
  await logActivity(actor, "message.assign", {
    entityType: "message",
    entityId: id,
    target: msg.subject,
    details: assigneeName ? `Assigned to ${assigneeName}` : "Unassigned",
  })
  revalidatePath("/admin/messages")
  return { ok: true }
}

export async function getContactMessageReplies() {
  await requireStaff()
  return db.select().from(contactMessageReplies).orderBy(contactMessageReplies.createdAt)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const MAX_REPLY_LENGTH = 10000

export async function replyToContactMessage(
  id: number,
  input: { body: string; markHandled: boolean },
): Promise<{ ok: true; emailStatus: "sent" | "skipped" } | { ok: false; error: string }> {
  const staff = await requireStaff()
  const body = String(input.body ?? "").trim()
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Invalid message." }
  if (body.length < 2) return { ok: false, error: "Write a reply before sending." }
  if (body.length > MAX_REPLY_LENGTH) return { ok: false, error: `Replies are limited to ${MAX_REPLY_LENGTH} characters.` }

  const [msg] = await db.select().from(contactMessages).where(eq(contactMessages.id, id)).limit(1)
  if (!msg) return { ok: false, error: "Message not found." }

  const subjectBase = msg.subject?.trim() || "Your VAAP inquiry"
  const subject = /^re:/i.test(subjectBase) ? subjectBase : `Re: ${subjectBase}`
  const paragraphs = body.split(/\n{2,}/).map((p) => escapeHtml(p).replace(/\n/g, "<br>"))
  const quoted = escapeHtml(msg.message.length > 1500 ? `${msg.message.slice(0, 1500)}…` : msg.message).replace(/\n/g, "<br>")
  const email = brandedEmail({
    subject,
    heading: `Dear ${escapeHtml(msg.name)},`,
    intro: paragraphs,
    footnote: `<strong>Your original message (${msg.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}):</strong><br>${quoted}`,
  })

  let emailStatus: "sent" | "skipped"
  try {
    const sent = await sendEmail({
      to: msg.email,
      subject: email.subject,
      html: email.html,
      text: `Dear ${msg.name},\n\n${body}\n\n---\nYour original message:\n${msg.message}`,
      templateKey: "contact-reply",
    })
    emailStatus = sent ? "sent" : "skipped"
  } catch (err) {
    await db.insert(contactMessageReplies).values({
      messageId: id,
      body,
      sentById: staff.id,
      sentByName: staff.name,
      emailStatus: "failed",
    })
    revalidatePath("/admin/messages")
    return { ok: false, error: `Email could not be delivered: ${err instanceof Error ? err.message : "unknown error"}. The draft was saved to the thread.` }
  }

  await db.insert(contactMessageReplies).values({
    messageId: id,
    body,
    sentById: staff.id,
    sentByName: staff.name,
    emailStatus,
  })
  const resolve = input.markHandled && emailStatus === "sent"
  await db
    .update(contactMessages)
    .set(resolve ? { handled: true, status: "resolved" } : msg.status === "pending" ? { status: "in_progress" } : {})
    .where(eq(contactMessages.id, id))
  await logActivity(staff, "message.reply", {
    entityType: "message",
    entityId: id,
    target: msg.subject,
    details: `Email ${emailStatus}${resolve ? " · resolved" : ""}`,
  })
  revalidatePath("/admin/messages")
  revalidatePath("/admin")
  return { ok: true, emailStatus }
}

// --- User & role management (admin only) -----------------------------------

export async function getUsers() {
  await requireAdmin()
  const [users, memberRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt)),
    db
      .select({
        userId: members.userId,
        email: members.email,
        status: members.status,
        membershipId: members.membershipId,
        goodStanding: members.goodStanding,
        expiresAt: members.expiresAt,
      })
      .from(members)
      .where(isNull(members.deletedAt)),
  ])

  // Same rule as getMembershipStanding: paid means an issued, active, in-good-standing,
  // unexpired membership. Checkout alone never counts.
  const now = Date.now()
  const paidByUserId = new Map<string, string>()
  const paidByEmail = new Map<string, string>()
  for (const m of memberRows) {
    if (!isIssuedMembership(m)) continue
    if (m.status !== "active" || !m.goodStanding) continue
    if (m.expiresAt && m.expiresAt.getTime() < now) continue
    if (m.userId) paidByUserId.set(m.userId, m.membershipId)
    if (m.email) paidByEmail.set(m.email.toLowerCase(), m.membershipId)
  }

  return users.map((u) => {
    const membershipId = paidByUserId.get(u.id) ?? paidByEmail.get(u.email.toLowerCase()) ?? null
    return { ...u, isPaid: Boolean(membershipId), membershipId }
  })
  }

export async function setUserRole(userId: string, role: "member" | "staff" | "manager" | "admin") {
  const admin = await requireAdmin()
  // Prevent an admin from demoting themselves and losing access.
  if (admin.id === userId && role !== "admin") {
    return { ok: false, error: "You cannot change your own admin role." }
  }
  if (!["member", "staff", "manager", "admin"].includes(role)) return { ok: false, error: "Invalid role." }
  const [target] = await db.select({ name: user.name, role: user.role }).from(user).where(eq(user.id, userId)).limit(1)
  if (!target) return { ok: false, error: "User not found." }
  await db.update(user).set({ role }).where(eq(user.id, userId))
  // Sign the user out everywhere so lost access takes effect immediately.
  if (target.role !== role) await db.delete(sessionTable).where(eq(sessionTable.userId, userId))
  await logActivity(admin, "user.role", {
    entityType: "user",
    entityId: userId,
    target: target.name ?? "",
    details: `${target.role} → ${role}`,
  })
  revalidatePath("/admin/users")
  return { ok: true }
}

// Super-admin sets/resets a user's login password directly. The password is
// hashed with Better Auth's own hasher and written to the credential account
// row so the user can immediately sign in with email + the new password.
export async function setUserPassword(userId: string, password: string) {
  const actor = await requireAdmin()
  await logActivity(actor, "user.password_reset", { entityType: "user", entityId: userId })

  const pwd = String(password ?? "")
  if (pwd.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." }
  }

  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1)
  if (!target) {
    return { ok: false, error: "User not found." }
  }

  const ctx = await auth.$context
  const hash = await ctx.password.hash(pwd)

  const [existing] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1)

  if (existing) {
    await db.update(account).set({ password: hash, updatedAt: new Date() }).where(eq(account.id, existing.id))
  } else {
    // No email/password credential yet (e.g. created another way) — create one.
    await db.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hash,
    })
  }

  revalidatePath("/admin/users")
  return { ok: true }
}

// Permanently removes a login account. Sessions and credentials cascade; the
// member record (if any) is kept and can be managed from /admin/members.
export async function deleteUser(userId: string) {
  try {
    const admin = await requireAdmin()
    if (admin.id === userId) return { ok: false, error: "You cannot delete your own account." }
    const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1)
    if (!target) return { ok: false, error: "User not found." }
    await db.delete(user).where(eq(user.id, userId))
    await logActivity(admin, "user.delete", { entityType: "user", entityId: userId })
    revalidatePath("/admin/users")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not delete user." }
  }
}

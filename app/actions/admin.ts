"use server"

import { db } from "@/lib/db"
import { news, events, membershipApplications, contactMessages, user, members, account, referralPartners } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { auth } from "@/lib/auth"
import { computeExpiry } from "@/lib/membership"
import { processMembershipApproval } from "@/lib/referral-engine"
import { notify } from "@/lib/notifications"
import { and, desc, eq } from "drizzle-orm"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

async function requireStaff() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  const role = session.user.role
  if (role !== "staff" && role !== "admin") throw new Error("Forbidden")
  return session.user
}

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin") throw new Error("Forbidden")
  return session.user
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

// --- News ------------------------------------------------------------------

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

  if (!title || !excerpt) return { ok: false, error: "Title and excerpt are required." }

  await db.insert(news).values({
    title,
    category,
    excerpt,
    content,
    image: image || null,
    committeeId: committeeId && !Number.isNaN(committeeId) ? committeeId : null,
    published,
    authorId: author.id,
  })
  revalidatePath("/admin/news")
  revalidatePath("/news")
  revalidatePath("/committees")
  revalidatePath("/")
  return { ok: true }
}

export async function updateNews(id: number, formData: FormData) {
  await requireStaff()
  const title = String(formData.get("title") ?? "").trim()
  const category = String(formData.get("category") ?? "Industry Update")
  const excerpt = String(formData.get("excerpt") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const image = String(formData.get("image") ?? "").trim()
  const committeeRaw = String(formData.get("committeeId") ?? "").trim()
  const committeeId = committeeRaw ? Number.parseInt(committeeRaw, 10) : null
  const published = formData.get("published") === "on"

  await db
    .update(news)
    .set({
      title,
      category,
      excerpt,
      content,
      image: image || null,
      committeeId: committeeId && !Number.isNaN(committeeId) ? committeeId : null,
      published,
    })
    .where(eq(news.id, id))
  revalidatePath("/admin/news")
  revalidatePath("/news")
  revalidatePath("/committees")
  revalidatePath("/")
  return { ok: true }
}

export async function deleteNews(id: number) {
  await requireStaff()
  await db.delete(news).where(eq(news.id, id))
  revalidatePath("/admin/news")
  revalidatePath("/news")
  revalidatePath("/committees")
  revalidatePath("/")
}

// --- Events ----------------------------------------------------------------

export async function createEvent(formData: FormData) {
  await requireStaff()
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const location = String(formData.get("location") ?? "").trim()
  const timeLabel = String(formData.get("timeLabel") ?? "").trim()
  const hostName = String(formData.get("hostName") ?? "").trim()
  const coverImage = String(formData.get("coverImage") ?? "").trim()
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim()
  const published = formData.get("published") === "on"

  if (!title) return { ok: false, error: "Title is required." }

  // Admin-created events are approved by default.
  await db.insert(events).values({
    title,
    description,
    location,
    timeLabel,
    hostName: hostName || null,
    coverImage: coverImage || null,
    startsAt: startsAtRaw ? new Date(startsAtRaw) : new Date(),
    published,
    status: "approved",
  })
  revalidatePath("/admin/events")
  revalidatePath("/events")
  revalidatePath("/")
  return { ok: true }
}

export async function updateEvent(id: number, formData: FormData) {
  await requireStaff()
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const location = String(formData.get("location") ?? "").trim()
  const timeLabel = String(formData.get("timeLabel") ?? "").trim()
  const hostName = String(formData.get("hostName") ?? "").trim()
  const coverImage = String(formData.get("coverImage") ?? "").trim()
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim()
  const published = formData.get("published") === "on"

  await db
    .update(events)
    .set({
      title,
      description,
      location,
      timeLabel,
      hostName: hostName || null,
      coverImage: coverImage || null,
      ...(startsAtRaw ? { startsAt: new Date(startsAtRaw) } : {}),
      published,
    })
    .where(eq(events.id, id))
  revalidatePath("/admin/events")
  revalidatePath("/events")
  revalidatePath("/")
  return { ok: true }
}

export async function setEventStatus(id: number, status: "approved" | "pending" | "rejected") {
  await requireStaff()
  await db.update(events).set({ status }).where(eq(events.id, id))
  revalidatePath("/admin/events")
  revalidatePath("/events")
  revalidatePath("/")
  return { ok: true }
}

export async function deleteEvent(id: number) {
  await requireStaff()
  await db.delete(events).where(eq(events.id, id))
  revalidatePath("/admin/events")
  revalidatePath("/events")
  revalidatePath("/")
}

// --- Membership applications ----------------------------------------------

export async function getApplications() {
  await requireStaff()
  return db.select().from(membershipApplications).orderBy(desc(membershipApplications.createdAt))
}

export async function setApplicationStatus(id: number, status: "pending" | "approved" | "rejected") {
  await requireStaff()
  await db.update(membershipApplications).set({ status }).where(eq(membershipApplications.id, id))

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
        emailTemplate: {
          subject: "Update on your VAAP membership application",
          heading: "Application update",
          intro: [
            `Dear ${statusApp.name},`,
            "Thank you for your interest in the Virtual Assets Association of Pakistan. After careful review, we're unable to approve your membership application at this time.",
            "If you believe this was in error or would like guidance on reapplying, simply reply to this email and our team will be glad to help.",
          ],
          footnote: "This decision does not prevent you from applying again in the future.",
        },
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
      const [existing] = await db.select().from(members).where(eq(members.email, application.email)).limit(1)
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
        emailTemplate: {
          subject: "Your VAAP membership is approved",
          heading: `Welcome to VAAP, ${application.name}`,
          intro: [
            `Congratulations — your ${application.category} membership has been approved and is now active.`,
            `Your membership ID is ${membershipId}. You can view your membership card, register to vote, and access member resources from your dashboard.`,
          ],
          ctaLabel: "Go to my membership",
          ctaPath: "/dashboard/membership",
        },
      })
    }
  }

  revalidatePath("/admin/applications")
}

// --- Contact messages ------------------------------------------------------

export async function getContactMessages() {
  await requireStaff()
  return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt))
}

export async function setMessageHandled(id: number, handled: boolean) {
  await requireStaff()
  await db.update(contactMessages).set({ handled }).where(eq(contactMessages.id, id))
  revalidatePath("/admin/messages")
}

// --- User & role management (admin only) -----------------------------------

export async function getUsers() {
  await requireAdmin()
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
}

export async function setUserRole(userId: string, role: "member" | "staff" | "admin") {
  const admin = await requireAdmin()
  // Prevent an admin from demoting themselves and losing access.
  if (admin.id === userId && role !== "admin") {
    return { ok: false, error: "You cannot change your own admin role." }
  }
  await db.update(user).set({ role }).where(eq(user.id, userId))
  revalidatePath("/admin/users")
  return { ok: true }
}

// Super-admin sets/resets a user's login password directly. The password is
// hashed with Better Auth's own hasher and written to the credential account
// row so the user can immediately sign in with email + the new password.
export async function setUserPassword(userId: string, password: string) {
  await requireAdmin()

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

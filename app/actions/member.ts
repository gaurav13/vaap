"use server"

import { formatAlertDate, sendAdminAlert } from "@/lib/admin-alerts"
import { db } from "@/lib/db"
import { EVENT_CATEGORIES, EVENT_CITIES, EVENT_FORMATS, pickOption } from "@/lib/event-options"
import {
  user,
  members,
  membershipApplications,
  events,
  staffProfiles,
  committees,
  rewardTransactions,
} from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { uniqueEventSlug } from "@/lib/event-slug-server"
import { notify } from "@/lib/notifications"
import { eq, desc, or, sql, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

async function requireUser() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  return session.user
}

export async function updateProfile(formData: FormData) {
  const current = await requireUser()
  const name = String(formData.get("name") ?? "").trim()
  const organization = String(formData.get("organization") ?? "").trim()
  const ntn = String(formData.get("ntn") ?? "").trim()
  const designation = String(formData.get("designation") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const linkedin = String(formData.get("linkedin") ?? "").trim()
  const website = String(formData.get("website") ?? "").trim()
  const city = String(formData.get("city") ?? "").trim()
  const bio = String(formData.get("bio") ?? "").trim()
  const authorBio = String(formData.get("authorBio") ?? "").replace(/\s+/g, " ").trim()
  const assetType = String(formData.get("assetType") ?? "").trim()
  const image = String(formData.get("image") ?? "").trim()

  if (!name) return { ok: false, error: "Name is required." }
  if (authorBio.length > 80) return { ok: false, error: "Author bio must be 80 characters or fewer." }

  try {
    await db
      .update(user)
      .set({ name, ...(image ? { image } : {}), updatedAt: new Date() })
      .where(eq(user.id, current.id))

    // Persist the extended profile on the member record. Upsert so the data
    // saves even before the user is an approved member: match an existing row
    // by userId or email, otherwise create a "pending" profile row that admin
    // approval later promotes to an active membership.
    const profileFields = {
      organization: organization || null,
      ntn: ntn || null,
      designation: designation || null,
      phone: phone || null,
      linkedin: linkedin || null,
      website: website || null,
      city: city || null,
      bio: bio || null,
      authorBio: authorBio || null,
      assetType: assetType || null,
    }
    const [existingMember] = await db
      .select()
      .from(members)
      .where(or(eq(members.userId, current.id), eq(members.email, current.email)))
      .limit(1)

    if (existingMember) {
      await db
        .update(members)
        .set({ ...profileFields, userId: existingMember.userId ?? current.id })
        .where(eq(members.id, existingMember.id))
    } else {
      await db.insert(members).values({
        userId: current.id,
        membershipId: `PENDING-${current.id}`,
        name: name || current.name || current.email,
        email: current.email,
        status: "pending",
        goodStanding: false,
        ...profileFields,
      })
    }
  } catch {
    return { ok: false, error: "Update failed." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/profile")
  revalidatePath("/dashboard/voting")
  return { ok: true }
}

// Eligible asset/tax categories that may register to vote.
const VOTE_ELIGIBLE_ASSET_TYPES = ["ntn", "blockchain", "virtual-asset"]

export async function registerToVote() {
  const current = await requireUser()
  const rows = await db.select().from(members).where(eq(members.userId, current.id)).limit(1)
  const member = rows[0]
  if (!member) return { ok: false, error: "No verified membership record found." }

  if (!VOTE_ELIGIBLE_ASSET_TYPES.includes(member.assetType ?? "")) {
    return {
      ok: false,
      error:
        "Voting registration is limited to NTN holders and blockchain / virtual-asset industry members. Update your profile with a qualifying category first.",
    }
  }
  if (member.status !== "active" || !member.goodStanding) {
    return { ok: false, error: "Your membership must be active and in good standing to register." }
  }

  await db.update(members).set({ voteRequested: true }).where(eq(members.id, member.id))

  revalidatePath("/dashboard/voting")
  return { ok: true }
}

export async function requestRenewal() {
  const current = await requireUser()
  const rows = await db.select().from(members).where(eq(members.userId, current.id)).limit(1)
  const member = rows[0]
  if (!member) return { ok: false, error: "No active membership record found." }

  // Log the renewal intent as a pending application for staff review.
  await db.insert(membershipApplications).values({
    name: member.name,
    email: member.email,
    organization: member.organization ?? null,
    category: member.category,
    message: `Membership renewal request for ${member.membershipId}.`,
    status: "pending",
  })

  await notify({
    userId: current.id,
    email: member.email,
    type: "application",
    title: "Renewal request submitted",
    body: `We've received your renewal request for ${member.membershipId}. Our team will review it shortly.`,
    link: "/dashboard/applications",
    emailKey: "membership.renewal-received",
    emailVars: { name: member.name, membershipId: member.membershipId },
  })
  await notify({
    role: "staff",
    type: "application",
    title: "New renewal request",
    body: `${member.name} (${member.membershipId}) requested a membership renewal.`,
    link: "/admin/applications",
  })

  revalidatePath("/dashboard/membership")
  return { ok: true }
}

export async function requestUpgrade(formData: FormData) {
  const current = await requireUser()
  const targetCategory = String(formData.get("category") ?? "").trim()

  const rows = await db.select().from(members).where(eq(members.userId, current.id)).limit(1)
  const member = rows[0]

  // Log the upgrade intent as a pending application for staff review.
  await db.insert(membershipApplications).values({
    name: member?.name ?? current.name ?? current.email,
    email: member?.email ?? current.email,
    organization: member?.organization ?? null,
    category: targetCategory || member?.category || "Corporate Members",
    message: member
      ? `Membership upgrade request from ${member.membershipId}${targetCategory ? ` to "${targetCategory}"` : ""}.`
      : `Membership application request${targetCategory ? ` for "${targetCategory}"` : ""}.`,
    status: "pending",
    completed: true,
  })

  await notify({
    userId: current.id,
    email: member?.email ?? current.email,
    type: "application",
    title: "Application submitted",
    body: targetCategory
      ? `We've received your request to move to "${targetCategory}". Our team will review it shortly.`
      : "We've received your membership application. Our team will review it shortly.",
    link: "/dashboard/applications",
    emailKey: "application.dashboard-submitted",
    emailVars: { name: member?.name ?? current.name ?? "", targetCategory },
  })
  await notify({
    role: "staff",
    type: "application",
    title: "New membership application",
    body: `${member?.name ?? current.name ?? current.email} submitted a membership application.`,
    link: "/admin/applications",
  })

  revalidatePath("/dashboard/membership")
  return { ok: true }
}

export async function getMyApplications() {
  const current = await requireUser()
  return db
    .select()
    .from(membershipApplications)
    .where(sql`lower(${membershipApplications.email}) = ${current.email.toLowerCase()}`)
    .orderBy(desc(membershipApplications.createdAt))
}

/**
 * Returns the verified member record for the current user, or null.
 * Only accepted (active, in good standing) members may publish events.
 */
async function getActiveMember(userId: string) {
  const rows = await db.select().from(members).where(eq(members.userId, userId)).limit(1)
  const m = rows[0]
  if (!m || m.status !== "active" || !m.goodStanding) return null
  return m
}

/**
 * Submit an event for review. Accepted members can publish; the event is
 * created with status "pending" and only appears publicly once an admin
 * approves it.
 */
export async function submitMemberEvent(formData: FormData) {
  const current = await requireUser()
  const member = await getActiveMember(current.id)
  if (!member) {
    return {
      ok: false,
      error: "Only active members in good standing can publish events.",
    }
  }

  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const location = String(formData.get("location") ?? "").trim()
  const timeLabel = String(formData.get("timeLabel") ?? "").trim()
  const dateStr = String(formData.get("date") ?? "").trim()
  const coverImage = String(formData.get("coverImage") ?? "").trim()
  const category = pickOption(EVENT_CATEGORIES, formData.get("category"))
  const city = pickOption(EVENT_CITIES, formData.get("city"))
  const format = pickOption(EVENT_FORMATS, formData.get("format"))

  if (!title) return { ok: false, error: "Event title is required." }
  if (title.length > 160) return { ok: false, error: "Event title is too long." }
  if (description.length > 4000) return { ok: false, error: "Description is too long." }
  if (!category) return { ok: false, error: "Please choose an event category." }
  if (!city) return { ok: false, error: "Please choose a city." }
  if (!format) return { ok: false, error: "Please choose an event format." }
  if (coverImage && !/^https:\/\/\S+$/i.test(coverImage)) {
    return { ok: false, error: "Cover image must be an https:// URL." }
  }
  if (!dateStr) return { ok: false, error: "Please choose a date for the event." }
  const startsAt = new Date(dateStr)
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "That date isn't valid." }

  try {
    await db.insert(events).values({
      title,
      slug: await uniqueEventSlug(title),
      description,
      location,
      timeLabel,
      startsAt,
      hostName: member.organization || member.name,
      coverImage: coverImage || null,
      category,
      city,
      format,
      submittedByUserId: current.id,
      submittedByName: member.name,
      status: "pending",
      published: true,
    })
  } catch {
    return { ok: false, error: "Could not submit event." }
  }

  sendAdminAlert("event", {
    name: member.name,
    email: current.email,
    title,
    eventDate: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" }).format(startsAt) + (timeLabel ? ` · ${timeLabel}` : ""),
    location: [location, city, format].filter(Boolean).join(" · "),
    submittedAt: formatAlertDate(),
    reviewUrl: "/admin/events",
  })

  revalidatePath("/dashboard/events")
  revalidatePath("/admin/events")
  return { ok: true }
}

/** Events the current user has submitted, newest first. */
export async function getMySubmittedEvents() {
  const current = await requireUser()
  return db
    .select()
    .from(events)
    .where(eq(events.submittedByUserId, current.id))
    .orderBy(desc(events.createdAt))
}

/** Whether the current user is an active member allowed to publish events. */
export async function canPublishEvents() {
  const session = await getSession()
  if (!session?.user) return false
  const member = await getActiveMember(session.user.id)
  return Boolean(member)
}

export type MyPosition = {
  role: string
  staff: {
    position: string
    committeeName: string | null
    committeeNames: string[]
    isCommitteeHead: boolean
    bio: string
  } | null
  membership: {
    membershipId: string
    category: string
    designation: string | null
    organization: string | null
    status: string
    votingEligible: boolean
  } | null
  rewards: { total: number; paid: number; count: number }
}

// A unified view of the signed-in user's standing within VAAP: their staff /
// committee position (if any), their membership category, and reward totals.
export async function getMyPosition(): Promise<MyPosition | null> {
  const session = await getSession()
  if (!session?.user) return null
  const userId = session.user.id

  const [staffRows, memberRows, rewardRows] = await Promise.all([
    db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1),
    db.select().from(members).where(eq(members.userId, userId)).limit(1),
    db
      .select({
        total: sql<number>`coalesce(sum(${rewardTransactions.rewardAmount}),0)::int`,
        paid: sql<number>`coalesce(sum(case when ${rewardTransactions.status} = 'paid' then ${rewardTransactions.rewardAmount} else 0 end),0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(rewardTransactions)
      .where(eq(rewardTransactions.referrerUserId, userId)),
  ])

  const staffRow = staffRows[0] ?? null
  const committeeIds =
    staffRow?.committeeIds && staffRow.committeeIds.length > 0
      ? staffRow.committeeIds
      : staffRow?.committeeId
        ? [staffRow.committeeId]
        : []
  let committeeNames: string[] = []
  if (committeeIds.length > 0) {
    const rows = await db
      .select({ name: committees.name })
      .from(committees)
      .where(inArray(committees.id, committeeIds))
    committeeNames = rows.map((r) => r.name)
  }
  const committeeName = committeeNames[0] ?? null

  const memberRow = memberRows[0] ?? null
  const rewards = rewardRows[0] ?? { total: 0, paid: 0, count: 0 }

  return {
    role: session.user.role,
    staff: staffRow
      ? {
          position: staffRow.position,
          committeeName,
          committeeNames,
          isCommitteeHead: staffRow.isCommitteeHead,
          bio: staffRow.bio,
        }
      : null,
    membership: memberRow
      ? {
          membershipId: memberRow.membershipId,
          category: memberRow.category,
          designation: memberRow.designation,
          organization: memberRow.organization,
          status: memberRow.status,
          votingEligible: memberRow.votingEligible,
        }
      : null,
    rewards,
  }
}

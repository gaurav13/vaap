"use server"

import { db } from "@/lib/db"
import { user, staffProfiles, committees, rewardTransactions } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin") throw new Error("Forbidden")
  return session.user
}

// Roles that count as "team / staff" for the admin management view.
const TEAM_ROLES = ["staff", "committee_head", "committee_member", "admin"]

export type StaffTeamMember = {
  userId: string
  name: string
  email: string
  role: string
  position: string
  committeeId: number | null
  committeeName: string | null
  committeeIds: number[]
  committeeNames: string[]
  isCommitteeHead: boolean
  bio: string
  photo: string | null
  phone: string | null
  rewardsTotal: number
  rewardsPaid: number
  rewardsCount: number
}

// Team roster: every user with a team role OR an existing staff profile, joined
// with their profile, committee name, and a summary of referral rewards earned.
export async function getStaffTeam(): Promise<{ team: StaffTeamMember[]; committees: { id: number; name: string }[] }> {
  await requireAdmin()

  const [users, profiles, committeeRows, rewardRows] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email, role: user.role }).from(user),
    db.select().from(staffProfiles),
    db.select({ id: committees.id, name: committees.name }).from(committees).orderBy(committees.sortOrder),
    db
      .select({
        userId: rewardTransactions.referrerUserId,
        total: sql<number>`coalesce(sum(${rewardTransactions.rewardAmount}),0)::int`,
        paid: sql<number>`coalesce(sum(case when ${rewardTransactions.status} = 'paid' then ${rewardTransactions.rewardAmount} else 0 end),0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(rewardTransactions)
      .groupBy(rewardTransactions.referrerUserId),
  ])

  const profileByUser = new Map(profiles.map((p) => [p.userId, p]))
  const committeeById = new Map(committeeRows.map((c) => [c.id, c.name]))
  const rewardByUser = new Map(rewardRows.filter((r) => r.userId).map((r) => [r.userId as string, r]))

  const team = users
    .filter((u) => TEAM_ROLES.includes(u.role) || profileByUser.has(u.id))
    .map((u) => {
      const p = profileByUser.get(u.id)
      const rewards = rewardByUser.get(u.id)
      const committeeIds =
        p?.committeeIds && p.committeeIds.length > 0
          ? p.committeeIds
          : p?.committeeId
            ? [p.committeeId]
            : []
      const committeeNames = committeeIds
        .map((id) => committeeById.get(id))
        .filter((n): n is string => Boolean(n))
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        position: p?.position ?? "",
        committeeId: committeeIds[0] ?? null,
        committeeName: committeeNames[0] ?? null,
        committeeIds,
        committeeNames,
        isCommitteeHead: p?.isCommitteeHead ?? false,
        bio: p?.bio ?? "",
        photo: p?.photo ?? null,
        phone: p?.phone ?? null,
        rewardsTotal: rewards?.total ?? 0,
        rewardsPaid: rewards?.paid ?? 0,
        rewardsCount: rewards?.count ?? 0,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return { team, committees: committeeRows }
}

// Reward transactions earned by a single team member — shown in the detail panel.
export async function getStaffRewards(userId: string) {
  await requireAdmin()
  return db
    .select()
    .from(rewardTransactions)
    .where(eq(rewardTransactions.referrerUserId, userId))
    .orderBy(desc(rewardTransactions.createdAt))
    .limit(50)
}

export async function saveStaffProfile(formData: FormData) {
  await requireAdmin()

  const userId = String(formData.get("userId") ?? "").trim()
  if (!userId) return { ok: false, error: "Missing user." }

  const position = String(formData.get("position") ?? "").trim()
  const committeeIds = formData
    .getAll("committeeId")
    .map((v) => Number(String(v).trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
  // Keep the single committeeId in sync (first selected) for backward compatibility.
  const committeeId = committeeIds[0] ?? null
  const isCommitteeHead = formData.get("isCommitteeHead") === "on" || formData.get("isCommitteeHead") === "true"
  const bio = String(formData.get("bio") ?? "").trim()
  const photo = String(formData.get("photo") ?? "").trim() || null
  const phone = String(formData.get("phone") ?? "").trim() || null

  const existing = await db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1)

  if (existing.length > 0) {
    await db
      .update(staffProfiles)
      .set({ position, committeeId, committeeIds, isCommitteeHead, bio, photo, phone })
      .where(eq(staffProfiles.userId, userId))
  } else {
    await db
      .insert(staffProfiles)
      .values({ userId, position, committeeId, committeeIds, isCommitteeHead, bio, photo, phone })
  }

  revalidatePath("/admin/staff")
  revalidatePath("/dashboard/position")
  return { ok: true }
}

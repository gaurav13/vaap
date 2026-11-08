"use server"

import { revalidatePath } from "next/cache"
import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { contactMessages, kolProfiles, members, type KolPlatform } from "@/lib/db/schema"
import { getSession, isAdmin, isStaff } from "@/lib/session"
import {
  emailKol,
  ensureKolProfile,
  getKolByMemberId,
  getPublicKolBySlug,
  logKol,
  refreshSlug,
  transitionKol,
} from "@/lib/kol"
import { KOL_EDITABLE, KOL_EXPERTISE, KOL_PLATFORMS, sumFollowers, type KolStatus } from "@/lib/kol-shared"
import { sendEmail } from "@/lib/mailer"
import { CONTACT_EMAIL } from "@/lib/contact"
import { formatAlertDate, sendAdminAlert } from "@/lib/admin-alerts"
import { notifyCommunity } from "@/lib/notifications"

type Result = { ok: true; message?: string } | { ok: false; error: string }

const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max)
const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n * 100) / 100, 1_000_000_000) : 0
}
const safeUrl = (v: unknown) => {
  const s = text(v, 500)
  if (!s) return ""
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`)
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : ""
  } catch {
    return ""
  }
}

async function currentMember() {
  const session = await getSession()
  if (!session?.user) throw new Error("Please sign in.")
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.userId, session.user.id), isNull(members.deletedAt)))
    .limit(1)
  return { user: session.user, member: member ?? null }
}

async function requireStaffUser() {
  const session = await getSession()
  if (!session?.user || !isStaff(session.user.role)) throw new Error("Not authorized")
  return session.user
}

export type KolApplicationInput = {
  fullName: string
  professionalName: string
  photo: string
  country: string
  city: string
  organization: string
  title: string
  bio: string
  expertise: string[]
  platforms: KolPlatform[]
  monthlyReach: number
  mediaAppearances: string
  collaborations: string
  achievements: string
  collabInterests: string
  evidenceNotes: string
}

function cleanPlatforms(input: unknown, keepOwnership: KolPlatform[] = []): KolPlatform[] {
  if (!Array.isArray(input)) return []
  const allowed = new Set<string>(KOL_PLATFORMS.map((p) => p.value))
  return input
    .slice(0, 10)
    .map((raw) => {
      const p = raw as Partial<KolPlatform>
      const url = safeUrl(p.url)
      const platform = allowed.has(String(p.platform)) ? String(p.platform) : "other"
      // Ownership is set by reviewers only; it survives edits while the URL stays the same.
      const prior = keepOwnership.find((k) => k.platform === platform && k.url === url)
      return {
        platform,
        url,
        followers: num(p.followers),
        avgViews: num(p.avgViews),
        engagement: Math.min(num(p.engagement), 100),
        ownershipVerified: prior?.ownershipVerified ?? false,
      }
    })
    .filter((p) => p.url)
}

function cleanProfile(input: KolApplicationInput, priorPlatforms: KolPlatform[]) {
  const expertiseSet = new Set<string>(KOL_EXPERTISE)
  const platforms = cleanPlatforms(input.platforms, priorPlatforms)
  return {
    fullName: text(input.fullName, 120),
    professionalName: text(input.professionalName, 120),
    photo: safeUrl(input.photo),
    country: text(input.country, 80) || "Pakistan",
    city: text(input.city, 80),
    organization: text(input.organization, 160),
    title: text(input.title, 160),
    bio: text(input.bio, 2000),
    expertise: (Array.isArray(input.expertise) ? input.expertise : []).filter((e) => expertiseSet.has(e)).slice(0, 8),
    platforms,
    monthlyReach: sumFollowers(platforms),
    mediaAppearances: text(input.mediaAppearances, 2000),
    collaborations: text(input.collaborations, 2000),
    achievements: text(input.achievements, 2000),
    collabInterests: text(input.collabInterests, 1000),
    evidenceNotes: text(input.evidenceNotes, 2000),
    updatedAt: new Date(),
  }
}

export async function saveKolApplication(input: KolApplicationInput, submit: boolean): Promise<Result> {
  try {
    const { user, member } = await currentMember()
    if (!member || member.status !== "active") {
      return { ok: false, error: "KOL verification is available to approved, active VAAP members only." }
    }
    const profile = await ensureKolProfile(member.id)
    if (!KOL_EDITABLE.includes(profile.status as KolStatus)) {
      return { ok: false, error: "Your application can't be edited while it is being reviewed." }
    }

    const data = cleanProfile(input, profile.platforms)

    if (submit) {
      const missing: string[] = []
      if (!data.fullName) missing.push("full name")
      if (!data.photo) missing.push("profile photo")
      if (!data.title) missing.push("current position")
      if (data.bio.length < 50) missing.push("a bio of at least 50 characters")
      if (data.expertise.length === 0) missing.push("at least one area of expertise")
      if (data.platforms.length === 0) missing.push("at least one social account")
      if (missing.length) return { ok: false, error: `Please add ${missing.join(", ")} before submitting.` }
    }

    await db
      .update(kolProfiles)
      .set(submit ? { ...data, status: "pending", submittedAt: new Date() } : data)
      .where(eq(kolProfiles.memberId, member.id))
    if (data.fullName && data.fullName !== profile.fullName) await refreshSlug(member.id, data.professionalName || data.fullName)

    if (submit) {
      await logKol(member.id, "submitted", { from: profile.status, to: "pending", actor: user.email })
      await emailKol(member.id, "kol.application-received")
      sendAdminAlert("kol", {
        name: data.professionalName || data.fullName,
        email: user.email,
        submittedAt: formatAlertDate(),
        reviewUrl: "/admin/kols",
      })
    } else {
      await logKol(member.id, "draft_saved", { actor: user.email })
    }
    revalidatePath("/dashboard/kol")
    revalidatePath("/admin/kol")
    return { ok: true, message: submit ? "Application submitted for review." : "Draft saved." }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save your application." }
  }
}

/** Verified KOLs refresh their audience numbers; reviewers then re-confirm the metrics. */
export async function updateKolStats(platforms: KolPlatform[], monthlyReach: number): Promise<Result> {
  try {
    const { user, member } = await currentMember()
    if (!member) return { ok: false, error: "Member profile not found." }
    const profile = await getKolByMemberId(member.id)
    if (!profile || profile.status !== "verified") return { ok: false, error: "Only Verified KOLs can update statistics." }
    const next = cleanPlatforms(platforms, profile.platforms)
    if (next.length === 0) return { ok: false, error: "Keep at least one social account." }
    await db
      .update(kolProfiles)
      .set({ platforms: next, monthlyReach: sumFollowers(next), metricsVerified: false, statsUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(kolProfiles.memberId, member.id))
    await logKol(member.id, "stats_updated", { actor: user.email, note: "Metrics awaiting re-confirmation" })
    revalidatePath("/dashboard/kol")
    revalidatePath(`/membership/verified-opinion-leaders/${profile.slug}`)
    revalidatePath("/membership/verified-opinion-leaders")
    return { ok: true, message: "Statistics updated. Our team will re-confirm them shortly." }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update statistics." }
  }
}

export async function addKolEvidence(file: { key: string; name: string }): Promise<Result> {
  const { user, member } = await currentMember()
  if (!member) return { ok: false, error: "Member profile not found." }
  const profile = await ensureKolProfile(member.id)
  if (!file.key.startsWith(`kol-evidence/${member.id}/`)) return { ok: false, error: "Invalid file." }
  const evidence = [...(profile.evidence ?? []), { key: file.key, name: text(file.name, 120), uploadedAt: new Date().toISOString() }].slice(-12)
  await db.update(kolProfiles).set({ evidence, updatedAt: new Date() }).where(eq(kolProfiles.memberId, member.id))
  await logKol(member.id, "evidence_added", { actor: user.email, note: file.name })
  revalidatePath("/dashboard/kol")
  return { ok: true }
}

export async function removeKolEvidence(key: string): Promise<Result> {
  const { member } = await currentMember()
  if (!member) return { ok: false, error: "Member profile not found." }
  const profile = await getKolByMemberId(member.id)
  if (!profile || !KOL_EDITABLE.includes(profile.status as KolStatus)) return { ok: false, error: "Evidence is locked during review." }
  await db
    .update(kolProfiles)
    .set({ evidence: profile.evidence.filter((e) => e.key !== key) })
    .where(eq(kolProfiles.memberId, member.id))
  revalidatePath("/dashboard/kol")
  return { ok: true }
}

export async function requestKolCollaboration(slug: string, formData: FormData): Promise<Result> {
  const kol = await getPublicKolBySlug(text(slug, 80))
  if (!kol) return { ok: false, error: "This profile is not available." }
  const name = text(formData.get("name"), 120)
  const email = text(formData.get("email"), 160)
  const organization = text(formData.get("organization"), 160)
  const message = text(formData.get("message"), 3000)
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
    return { ok: false, error: "Please enter your name, a valid email and a short message." }
  }
  const displayName = kol.professionalName || kol.fullName
  await db.insert(contactMessages).values({
    name,
    email,
    organization,
    inquiryType: "KOL Collaboration",
    subject: `Collaboration request for ${displayName}`,
    message,
  })
  try {
    await sendEmail({
      to: CONTACT_EMAIL,
      subject: `KOL collaboration request: ${displayName}`,
      text: `${name} <${email}>${organization ? ` (${organization})` : ""} would like to collaborate with ${displayName}.\n\n${message}`,
      html: "",
    })
  } catch (error) {
    console.error("[v0] KOL collaboration email failed", error)
  }
  return { ok: true, message: "Thanks — VAAP will forward your request." }
}

// --- Admin -----------------------------------------------------------------

const ADMIN_ONLY: KolStatus[] = ["verified", "rejected", "revoked"]

export async function adminSetKolStatus(memberId: number, status: KolStatus, note = ""): Promise<Result> {
  try {
    const user = await requireStaffUser()
    if (ADMIN_ONLY.includes(status) && !isAdmin(user.role)) {
      return { ok: false, error: "Only administrators can approve, reject or revoke KOL verification." }
    }
    if ((status === "rejected" || status === "revoked" || status === "info_required") && !note.trim()) {
      return { ok: false, error: "Please add a note explaining this decision to the member." }
    }
    const member = await db.select().from(members).where(eq(members.id, memberId)).limit(1)
    if (status === "verified" && member[0]?.status !== "active") {
      return { ok: false, error: "Only active members can be verified as KOLs." }
    }
    await transitionKol(memberId, status, { actor: user.email, note: text(note, 1000) })
    if (status === "verified") {
      await notifyCommunity({
        type: "kol",
        title: "New Verified KOL",
        body: `${member[0]?.name ?? "A member"} is now a Verified Opinion Leader.`,
        link: "/membership/verified-opinion-leaders",
      })
    }
    revalidatePath("/admin/kol")
    revalidatePath(`/admin/kol/${memberId}`)
    revalidatePath("/membership/verified-opinion-leaders")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update status." }
  }
}

/** Staff edit any profile content in place; status, checks and timestamps are left untouched. */
export async function adminUpdateKolProfile(memberId: number, input: KolApplicationInput): Promise<Result> {
  try {
    const user = await requireStaffUser()
    const profile = await getKolByMemberId(Number(memberId))
    if (!profile) return { ok: false, error: "Profile not found." }
    const data = cleanProfile(input, profile.platforms)
    if (!data.fullName) return { ok: false, error: "Full name is required." }

    await db.update(kolProfiles).set(data).where(eq(kolProfiles.memberId, profile.memberId))
    const nameChanged =
      data.fullName !== profile.fullName || data.professionalName !== profile.professionalName
    if (nameChanged) await refreshSlug(profile.memberId, data.professionalName || data.fullName)

    const changed = (Object.keys(data) as (keyof typeof data)[])
      .filter((k) => k !== "updatedAt" && JSON.stringify(data[k]) !== JSON.stringify(profile[k]))
      .join(", ")
    await logKol(profile.memberId, "admin_edited", { actor: user.email, note: changed ? `Updated: ${changed}` : "No changes" })

    revalidatePath("/admin/kols")
    revalidatePath("/dashboard/kol")
    revalidatePath("/membership/verified-opinion-leaders")
    revalidatePath(`/membership/verified-opinion-leaders/${profile.slug}`)
    return { ok: true, message: "Profile updated." }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update profile." }
  }
}

export async function adminInviteKols(memberIds: number[]): Promise<Result> {
  try {
    const user = await requireStaffUser()
    const ids = [...new Set(memberIds.map(Number).filter(Number.isInteger))].slice(0, 200)
    let sent = 0
    for (const id of ids) {
      const profile = await ensureKolProfile(id)
      if (profile.status === "verified") continue
      if (await emailKol(id, "kol.invitation")) sent++
      await db.update(kolProfiles).set({ invitedAt: new Date() }).where(eq(kolProfiles.memberId, id))
      await logKol(id, "invited", { actor: user.email })
    }
    revalidatePath("/admin/kol")
    return { ok: true, message: `Invitation sent to ${sent} member${sent === 1 ? "" : "s"}.` }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not send invitations." }
  }
}

export async function adminSetKolCheck(
  memberId: number,
  check: "identity" | "metrics" | { platformIndex: number },
  value: boolean,
): Promise<Result> {
  try {
    const user = await requireStaffUser()
    const profile = await getKolByMemberId(memberId)
    if (!profile) return { ok: false, error: "Application not found." }
    let label: string
    if (check === "identity") {
      await db.update(kolProfiles).set({ identityVerified: value }).where(eq(kolProfiles.memberId, memberId))
      label = "Identity"
    } else if (check === "metrics") {
      await db.update(kolProfiles).set({ metricsVerified: value }).where(eq(kolProfiles.memberId, memberId))
      label = "Audience metrics"
    } else {
      const platforms = profile.platforms.map((p, i) => (i === check.platformIndex ? { ...p, ownershipVerified: value } : p))
      await db.update(kolProfiles).set({ platforms }).where(eq(kolProfiles.memberId, memberId))
      label = `Ownership of ${profile.platforms[check.platformIndex]?.url ?? "account"}`
    }
    await logKol(memberId, "check", { actor: user.email, note: `${label} ${value ? "confirmed" : "unconfirmed"}` })
    revalidatePath(`/admin/kol/${memberId}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update." }
  }
}

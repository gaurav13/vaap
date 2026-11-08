"use server"

import { randomBytes } from "crypto"
import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { membershipApplications, membershipInvitationCodes, membershipPlans } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { normalizeInvitationCode, planAccess } from "@/lib/membership-access"
import { setApplicationStatus } from "@/app/actions/admin"

type Result = { ok: true } | { ok: false; error: string }

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin") throw new Error("Forbidden")
  return session.user
}

function usableCodeWhere(code: string) {
  return and(
    sql`upper(${membershipInvitationCodes.code}) = ${normalizeInvitationCode(code)}`,
    eq(membershipInvitationCodes.active, true),
    or(isNull(membershipInvitationCodes.maxUses), lt(membershipInvitationCodes.usedCount, membershipInvitationCodes.maxUses)),
    or(isNull(membershipInvitationCodes.expiresAt), gt(membershipInvitationCodes.expiresAt, new Date())),
  )
}

const INVALID_CODE = "This invitation code is invalid, expired, or has already been used."

// Public: lets the apply wizard check a code before the applicant continues.
export async function checkInvitationCode(code: string): Promise<Result> {
  if (!normalizeInvitationCode(code)) return { ok: false, error: "Please enter your invitation code." }
  const [row] = await db
    .select({ id: membershipInvitationCodes.id })
    .from(membershipInvitationCodes)
    .where(usableCodeWhere(code))
    .limit(1)
  return row ? { ok: true } : { ok: false, error: INVALID_CODE }
}

// Atomically redeems one use of a code. Returns the stored code on success.
export async function redeemInvitationCode(code: string): Promise<string | null> {
  if (!normalizeInvitationCode(code)) return null
  const [row] = await db
    .update(membershipInvitationCodes)
    .set({ usedCount: sql`${membershipInvitationCodes.usedCount} + 1` })
    .where(usableCodeWhere(code))
    .returning({ code: membershipInvitationCodes.code })
  return row?.code ?? null
}

// Resolves the access rule for a submitted category title (server-trusted).
export async function accessForCategory(category: string) {
  const [plan] = await db
    .select({ icon: membershipPlans.icon })
    .from(membershipPlans)
    .where(eq(membershipPlans.title, category))
    .limit(1)
  return planAccess(plan?.icon ?? "")
}

// ---- Admin ----------------------------------------------------------------

export async function getInvitationCodes() {
  await requireAdmin()
  return db.select().from(membershipInvitationCodes).orderBy(desc(membershipInvitationCodes.createdAt))
}

function generateCode() {
  return `ACAD-${randomBytes(4).toString("hex").toUpperCase()}`
}

export async function createInvitationCode(input: {
  code?: string
  label?: string
  maxUses?: number | null
  expiresAt?: string | null
}): Promise<Result & { code?: string }> {
  const me = await requireAdmin()
  const code = normalizeInvitationCode(input.code ?? "") || generateCode()
  if (!/^[A-Z0-9-]{4,40}$/.test(code)) {
    return { ok: false, error: "Codes must be 4–40 characters: letters, numbers and dashes only." }
  }
  const maxUses = input.maxUses && input.maxUses > 0 ? Math.floor(input.maxUses) : null
  const expiresAt = input.expiresAt ? new Date(`${input.expiresAt}T23:59:59`) : null
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { ok: false, error: "Please enter a valid expiry date." }

  const [existing] = await db
    .select({ id: membershipInvitationCodes.id })
    .from(membershipInvitationCodes)
    .where(sql`upper(${membershipInvitationCodes.code}) = ${code}`)
    .limit(1)
  if (existing) return { ok: false, error: "That code already exists. Choose a different one." }

  await db.insert(membershipInvitationCodes).values({
    code,
    label: (input.label ?? "").trim().slice(0, 120),
    maxUses,
    expiresAt,
    createdBy: me.email ?? me.id,
  })
  revalidatePath("/admin/invitations")
  return { ok: true, code }
}

export async function setInvitationCodeActive(id: number, active: boolean): Promise<Result> {
  await requireAdmin()
  await db.update(membershipInvitationCodes).set({ active }).where(eq(membershipInvitationCodes.id, id))
  revalidatePath("/admin/invitations")
  return { ok: true }
}

export async function deleteInvitationCode(id: number): Promise<Result> {
  await requireAdmin()
  await db.delete(membershipInvitationCodes).where(eq(membershipInvitationCodes.id, id))
  revalidatePath("/admin/invitations")
  return { ok: true }
}

// Admin-only enrolment for Government & Public Institution memberships.
export async function enrolGovernmentMember(input: {
  category: string
  name: string
  email: string
  organization: string
  designation?: string
  phone?: string
  approveNow: boolean
}): Promise<Result & { reference?: string }> {
  await requireAdmin()
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const organization = input.organization.trim()
  if (!name || !email || !organization) return { ok: false, error: "Name, email and institution are required." }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Please enter a valid email address." }

  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.title, input.category))
    .limit(1)
  if (!plan || planAccess(plan.icon) !== "admin") return { ok: false, error: "Please choose a government membership plan." }

  const [inserted] = await db
    .insert(membershipApplications)
    .values({
      name,
      email,
      organization,
      designation: input.designation?.trim() || null,
      phone: input.phone?.trim() || null,
      category: plan.title,
      industrySector: "Government & Public Sector",
      paymentMethod: "waived",
      admissionFee: plan.admissionFee,
      annualFee: plan.annualFee,
      totalAmount: plan.annualFee || "Complimentary",
      message: `Enrolled by VAAP admin for ${plan.title}.`,
      completed: true,
      status: "pending",
    })
    .returning({ id: membershipApplications.id, createdAt: membershipApplications.createdAt })

  const reference = `VAAP-${new Date(inserted.createdAt).getFullYear()}-${String(inserted.id).padStart(6, "0")}`
  await db.update(membershipApplications).set({ reference }).where(eq(membershipApplications.id, inserted.id))

  if (input.approveNow) await setApplicationStatus(inserted.id, "approved")

  revalidatePath("/admin/applications")
  revalidatePath("/admin/invitations")
  return { ok: true, reference }
}

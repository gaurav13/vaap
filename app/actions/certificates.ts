"use server"

import { revalidatePath } from "next/cache"
import { getSession, isStaff } from "@/lib/session"
import { issueCertificate, revokeCertificates } from "@/lib/certificates"

type Result = { ok: true } | { ok: false; error: string }

async function requireStaffUser() {
  const session = await getSession()
  if (!session?.user || !isStaff(session.user.role)) throw new Error("Not authorized")
  return session.user
}

export async function regenerateMemberCertificate(memberId: number): Promise<Result> {
  try {
    const user = await requireStaffUser()
    await issueCertificate(memberId, user.email)
    revalidatePath("/admin/members")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not issue certificate" }
  }
}

export async function revokeMemberCertificate(memberId: number): Promise<Result> {
  try {
    const user = await requireStaffUser()
    await revokeCertificates(memberId, `Revoked by ${user.email}`)
    revalidatePath("/admin/members")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not revoke certificate" }
  }
}

import { randomBytes } from "node:crypto"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { members, membershipCertificates } from "@/lib/db/schema"
import { effectiveExpiry } from "@/lib/membership"

export type CertificateRecord = typeof membershipCertificates.$inferSelect
export type VerificationStatus = "active" | "expired" | "suspended" | "revoked"

// 144 bits of randomness, URL-safe: impossible to enumerate or guess.
function newToken() {
  return randomBytes(18).toString("base64url")
}

export function verificationPath(token: string) {
  return `/membership/verify/c/${token}`
}

export async function getCurrentCertificate(memberId: number) {
  const rows = await db
    .select()
    .from(membershipCertificates)
    .where(and(eq(membershipCertificates.memberId, memberId), eq(membershipCertificates.status, "issued")))
    .orderBy(desc(membershipCertificates.issuedAt))
    .limit(1)
  return rows[0] ?? null
}

export async function hasAnyCertificate(memberId: number) {
  const rows = await db
    .select({ id: membershipCertificates.id })
    .from(membershipCertificates)
    .where(eq(membershipCertificates.memberId, memberId))
    .limit(1)
  return rows.length > 0
}

export async function revokeCertificates(memberId: number, reason: string) {
  await db
    .update(membershipCertificates)
    .set({ status: "revoked", revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(membershipCertificates.memberId, memberId), eq(membershipCertificates.status, "issued")))
}

// Issues a fresh certificate, revoking any previously issued one so only the
// newest printed QR code verifies.
export async function issueCertificate(memberId: number, issuedBy: string | null) {
  const member = (await db.select().from(members).where(eq(members.id, memberId)).limit(1))[0]
  if (!member) throw new Error("Member not found")
  await revokeCertificates(memberId, "Superseded by a newly issued certificate")
  const [cert] = await db
    .insert(membershipCertificates)
    .values({
      memberId,
      token: newToken(),
      expiresAt: effectiveExpiry(member.joinedAt, member.expiresAt),
      issuedBy,
    })
    .returning()
  return cert
}

// Public verification record. Only non-sensitive fields are returned — never
// email, phone, CNIC or other contact details.
export async function getVerification(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null
  const rows = await db
    .select({ cert: membershipCertificates, member: members })
    .from(membershipCertificates)
    .innerJoin(members, eq(members.id, membershipCertificates.memberId))
    .where(eq(membershipCertificates.token, token))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  const { cert, member } = row

  // Status is computed live from the member record so suspensions, expiry and
  // renewals are reflected the moment they happen.
  const expiresAt = effectiveExpiry(member.joinedAt, member.expiresAt)
  let status: VerificationStatus
  if (cert.status === "revoked" || member.deletedAt) status = "revoked"
  else if (member.status === "suspended") status = "suspended"
  else if (member.status === "expired" || (expiresAt && expiresAt.getTime() < Date.now())) status = "expired"
  else status = "active"

  return {
    status,
    name: member.name,
    organization: member.organization,
    membershipId: member.membershipId,
    category: member.category,
    issuedAt: cert.issuedAt,
    memberSince: member.joinedAt,
    expiresAt,
    revokedAt: cert.revokedAt,
    revokedReason: cert.status === "revoked" ? cert.revokedReason : null,
  }
}

export type Verification = NonNullable<Awaited<ReturnType<typeof getVerification>>>

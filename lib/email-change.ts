import "server-only"
import crypto from "crypto"
import { and, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { auditLogs, emailChangeRequests, members, membershipApplications, user } from "@/lib/db/schema"
import { brandedEmail, sendEmail } from "@/lib/mailer"

const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex")

export async function findEmailChange(token: string | null | undefined) {
  if (!token || token.length > 200) return null
  const [req] = await db.select().from(emailChangeRequests).where(eq(emailChangeRequests.tokenHash, hashToken(token))).limit(1)
  if (!req) return null
  const state = req.confirmedAt ? "confirmed" : req.cancelledAt ? "cancelled" : req.expiresAt < new Date() ? "expired" : "open"
  return { req, state } as const
}

/** Applies a confirmed email change to the login account, membership and applications. */
export async function confirmEmailChange(token: string): Promise<{ ok: true; newEmail: string } | { ok: false; error: string }> {
  const found = await findEmailChange(token)
  if (!found) return { ok: false, error: "This link is not valid." }
  if (found.state !== "open") return { ok: false, error: `This link has ${found.state === "confirmed" ? "already been used" : found.state}.` }
  const { req } = found
  const oldEmail = req.oldEmail.toLowerCase()
  const newEmail = req.newEmail.toLowerCase()

  const [taken] = await db.select({ id: user.id }).from(user).where(sql`lower(${user.email}) = ${newEmail}`).limit(1)
  if (taken && taken.id !== req.userId) return { ok: false, error: "That email is now used by another account. Contact VAAP support." }

  // Claim the request first so a double submit cannot apply it twice.
  const claimed = await db
    .update(emailChangeRequests)
    .set({ confirmedAt: new Date() })
    .where(and(eq(emailChangeRequests.id, req.id), isNull(emailChangeRequests.confirmedAt), isNull(emailChangeRequests.cancelledAt)))
    .returning({ id: emailChangeRequests.id })
  if (!claimed.length) return { ok: false, error: "This link has already been used." }

  if (req.userId) {
    await db.update(user).set({ email: newEmail, emailVerified: true, updatedAt: new Date() }).where(eq(user.id, req.userId))
    await db.update(members).set({ email: newEmail }).where(eq(members.userId, req.userId))
  }
  await db.update(members).set({ email: newEmail }).where(and(isNull(members.deletedAt), sql`lower(${members.email}) = ${oldEmail}`))
  await db.update(membershipApplications).set({ email: newEmail }).where(sql`lower(${membershipApplications.email}) = ${oldEmail}`)
  if (req.applicationId) {
    await db.update(membershipApplications).set({ email: newEmail }).where(eq(membershipApplications.id, req.applicationId))
  }

  await db.insert(auditLogs).values({
    actorId: req.requestedBy,
    actorName: req.requestedByName,
    actorRole: "admin",
    action: "member.email_changed",
    entityType: req.applicationId ? "application" : "member",
    entityId: String(req.applicationId ?? ""),
    target: newEmail,
    details: `Email changed ${oldEmail} → ${newEmail} after the new address was verified.`,
  })

  // Security notice to the previous address.
  const notice = brandedEmail({
    subject: "Your VAAP email address was changed",
    heading: "Email address updated",
    intro: [
      `The email on your VAAP account was changed to ${newEmail} after that address was verified.`,
      "If you did not request this, contact VAAP support immediately.",
    ],
  })
  await sendEmail({ to: oldEmail, subject: notice.subject, html: notice.html, text: notice.text, templateKey: "account.email-changed" }).catch(() => false)
  return { ok: true, newEmail }
}

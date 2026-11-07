import { and, desc, eq, isNull, notInArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { kolAuditLog, kolProfiles, members } from "@/lib/db/schema"
import { ownershipCode } from "@/lib/kol"
import { KolAdminManager, type AdminKolRow } from "@/components/kol/kol-admin-manager"

export const dynamic = "force-dynamic"

const iso = (d: Date | null) => (d ? d.toISOString() : null)

export default async function AdminKolsPage() {
  const rows = await db
    .select({ kol: kolProfiles, memberName: members.name, memberEmail: members.email, memberStatus: members.status })
    .from(kolProfiles)
    .innerJoin(members, eq(members.id, kolProfiles.memberId))
    .where(isNull(members.deletedAt))
    .orderBy(desc(kolProfiles.updatedAt))

  const ids = rows.map((r) => r.kol.memberId)
  const audit = ids.length
    ? await db.select().from(kolAuditLog).orderBy(desc(kolAuditLog.createdAt)).limit(1000)
    : []

  const invitable = await db
    .select({ id: members.id, name: members.name, email: members.email })
    .from(members)
    .where(
      and(
        eq(members.status, "active"),
        isNull(members.deletedAt),
        ids.length ? notInArray(members.id, ids) : undefined,
      ),
    )
    .orderBy(members.name)
    .limit(1000)

  const items: AdminKolRow[] = rows.map(({ kol, memberName, memberEmail, memberStatus }) => ({
    memberId: kol.memberId,
    slug: kol.slug,
    status: kol.status,
    memberName,
    memberEmail,
    memberStatus,
    displayName: kol.professionalName || kol.fullName || memberName,
    fullName: kol.fullName,
    professionalName: kol.professionalName,
    collabInterests: kol.collabInterests,
    photo: kol.photo,
    title: kol.title,
    organization: kol.organization,
    city: kol.city,
    country: kol.country,
    bio: kol.bio,
    expertise: kol.expertise,
    platforms: kol.platforms,
    monthlyReach: kol.monthlyReach,
    mediaAppearances: kol.mediaAppearances,
    collaborations: kol.collaborations,
    achievements: kol.achievements,
    evidence: kol.evidence,
    evidenceNotes: kol.evidenceNotes,
    identityVerified: kol.identityVerified,
    metricsVerified: kol.metricsVerified,
    adminNote: kol.adminNote,
    ownershipCode: ownershipCode(kol.memberId),
    submittedAt: iso(kol.submittedAt),
    verifiedAt: iso(kol.verifiedAt),
    expiresAt: iso(kol.expiresAt),
    invitedAt: iso(kol.invitedAt),
    reviewedBy: kol.reviewedBy,
    audit: audit
      .filter((a) => a.memberId === kol.memberId)
      .slice(0, 30)
      .map((a) => ({
        id: a.id,
        action: a.action,
        fromStatus: a.fromStatus,
        toStatus: a.toStatus,
        note: a.note,
        actor: a.actor,
        createdAt: a.createdAt.toISOString(),
      })),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-bold text-heading">KOL Verification</h1>
        <p className="text-muted-2">
          Review Verified Opinion Leader applications, confirm account ownership and metrics, and manage the public
          directory.
        </p>
      </div>
      <KolAdminManager items={items} invitable={invitable} />
    </div>
  )
}

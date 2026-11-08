import { asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { membershipPlans } from "@/lib/db/schema"
import { getInvitationCodes } from "@/app/actions/invitations"
import { planAccess } from "@/lib/membership-access"
import { InvitationManager } from "@/components/admin/invitation-manager"
import { GovernmentEnrolForm } from "@/components/admin/government-enrol-form"

export default async function AdminInvitationsPage() {
  const [codes, plans] = await Promise.all([
    getInvitationCodes(),
    db.select({ title: membershipPlans.title, icon: membershipPlans.icon }).from(membershipPlans).orderBy(asc(membershipPlans.sortOrder)),
  ])
  const governmentPlans = plans.filter((p) => planAccess(p.icon) === "admin").map((p) => p.title)

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-serif text-2xl font-bold text-heading">Invitations &amp; Enrolment</h1>
        <p className="mt-1 text-muted-2">
          Issue invitation codes for Academic &amp; Research applicants and enrol Government &amp; Public Institution members
          directly.
        </p>
      </div>

      <InvitationManager
        codes={codes.map((c) => ({
          id: c.id,
          code: c.code,
          label: c.label ?? "",
          maxUses: c.maxUses,
          usedCount: c.usedCount,
          active: c.active,
          expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
          createdAt: new Date(c.createdAt).toISOString(),
        }))}
      />

      <GovernmentEnrolForm plans={governmentPlans} />
    </div>
  )
}

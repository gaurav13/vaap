import { db } from "@/lib/db"
import { membershipPlans } from "@/lib/db/schema"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"

export default async function AdminMembershipPlansPage() {
  const rows = await db.select().from(membershipPlans).orderBy(membershipPlans.sortOrder)
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.membershipPlans.label}</h1>
      <p className="mt-1 text-muted-2">{ENTITIES.membershipPlans.description}</p>
      <EntityManager entity="membershipPlans" items={serializeRows(rows)} />
    </div>
  )
}

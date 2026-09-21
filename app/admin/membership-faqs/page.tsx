import { db } from "@/lib/db"
import { membershipFaqs } from "@/lib/db/schema"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"

export default async function AdminMembershipFaqsPage() {
  const rows = await db.select().from(membershipFaqs).orderBy(membershipFaqs.sortOrder)
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.membershipFaqs.label}</h1>
      <p className="mt-1 text-muted-2">{ENTITIES.membershipFaqs.description}</p>
      <EntityManager entity="membershipFaqs" items={serializeRows(rows)} />
    </div>
  )
}

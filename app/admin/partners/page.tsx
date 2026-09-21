import { db } from "@/lib/db"
import { partners } from "@/lib/db/schema"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"

export default async function AdminPartnersPage() {
  const rows = await db.select().from(partners).orderBy(partners.sortOrder)
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.partners.label}</h1>
      <p className="mt-1 text-muted-2">{ENTITIES.partners.description}</p>
      <EntityManager entity="partners" items={serializeRows(rows)} />
    </div>
  )
}

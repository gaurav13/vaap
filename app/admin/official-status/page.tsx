import { db } from "@/lib/db"
import { officialStatus } from "@/lib/db/schema"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"

export default async function AdminOfficialStatusPage() {
  const rows = await db.select().from(officialStatus).orderBy(officialStatus.sortOrder)
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.officialStatus.label}</h1>
      <p className="mt-1 text-muted-2">{ENTITIES.officialStatus.description}</p>
      <EntityManager entity="officialStatus" items={serializeRows(rows)} />
    </div>
  )
}

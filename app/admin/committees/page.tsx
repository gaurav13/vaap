import { db } from "@/lib/db"
import { committees } from "@/lib/db/schema"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"

export default async function AdminCommitteesPage() {
  const rows = await db.select().from(committees).orderBy(committees.sortOrder)
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.committees.label}</h1>
      <p className="mt-1 text-muted-2">{ENTITIES.committees.description}</p>
      <EntityManager entity="committees" items={serializeRows(rows)} />
    </div>
  )
}

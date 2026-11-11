import { db } from "@/lib/db"
import { mediaCoverage } from "@/lib/db/schema"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"

export default async function AdminMediaCoveragePage() {
  const rows = await db.select().from(mediaCoverage).orderBy(mediaCoverage.sortOrder, mediaCoverage.id)
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.mediaCoverage.label}</h1>
      <p className="mt-1 text-muted-2">{ENTITIES.mediaCoverage.description}</p>
      <EntityManager entity="mediaCoverage" items={serializeRows(rows)} />
    </div>
  )
}

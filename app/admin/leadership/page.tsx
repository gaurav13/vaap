import { db } from "@/lib/db"
import { leadership } from "@/lib/db/schema"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"

export default async function AdminLeadershipPage() {
  const rows = await db.select().from(leadership).orderBy(leadership.sortOrder)
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.leadership.label}</h1>
      <p className="mt-1 text-muted-2">{ENTITIES.leadership.description}</p>
      <EntityManager entity="leadership" items={serializeRows(rows)} />
    </div>
  )
}

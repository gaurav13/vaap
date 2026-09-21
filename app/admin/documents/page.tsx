import { db } from "@/lib/db"
import { documents } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"

export default async function AdminDocumentsPage() {
  const rows = await db.select().from(documents).orderBy(desc(documents.createdAt))
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.documents.label}</h1>
      <p className="mt-1 text-muted-2">{ENTITIES.documents.description}</p>
      <EntityManager entity="documents" items={serializeRows(rows)} />
    </div>
  )
}

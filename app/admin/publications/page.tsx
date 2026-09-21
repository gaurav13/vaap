import { db } from "@/lib/db"
import { publications } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"

export default async function AdminPublicationsPage() {
  const rows = await db.select().from(publications).orderBy(desc(publications.createdAt))
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.publications.label}</h1>
      <p className="mt-1 text-muted-2">{ENTITIES.publications.description}</p>
      <EntityManager entity="publications" items={serializeRows(rows)} />
    </div>
  )
}

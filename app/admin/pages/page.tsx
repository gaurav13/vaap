import { db } from "@/lib/db"
import { pages } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"

export default async function AdminPagesPage() {
  const rows = await db.select().from(pages).orderBy(desc(pages.updatedAt))
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.pages.label}</h1>
      <p className="mt-1 text-muted-2">{ENTITIES.pages.description}</p>
      <EntityManager entity="pages" items={serializeRows(rows)} />
    </div>
  )
}

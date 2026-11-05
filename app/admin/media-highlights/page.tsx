import { db } from "@/lib/db"
import { mediaHighlights } from "@/lib/db/schema"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"

export default async function AdminMediaHighlightsPage() {
  const rows = await db.select().from(mediaHighlights).orderBy(mediaHighlights.sortOrder)
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.mediaHighlights.label}</h1>
      <p className="mt-1 text-muted-2">{ENTITIES.mediaHighlights.description}</p>
      <EntityManager entity="mediaHighlights" items={serializeRows(rows)} />
    </div>
  )
}

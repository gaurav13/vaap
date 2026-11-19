import { db } from "@/lib/db"
import { leadership } from "@/lib/db/schema"
import { EntityManager } from "@/components/admin/entity-manager"
import { serializeRows } from "@/lib/cms/serialize"
import { ENTITIES } from "@/lib/cms/entities"
import { listLeadershipQueue } from "@/app/actions/leadership"
import { LeadershipQueue } from "@/components/admin/leadership/queue"
import { LeadershipTypeNames } from "@/components/admin/leadership/type-names"
import { getLeadershipTypeLabels } from "@/lib/site-settings"
import { LEADERSHIP_TYPES, typeLabel } from "@/lib/leadership"

export default async function AdminLeadershipPage() {
  const [rows, queue, typeLabels] = await Promise.all([
    db.select().from(leadership).orderBy(leadership.sortOrder),
    listLeadershipQueue(),
    getLeadershipTypeLabels(),
  ])
  const kindNames = Object.fromEntries(
    [...LEADERSHIP_TYPES.map((t) => t.value), "Advisory Board Members"].map((k) => [k, typeLabel(k, typeLabels)]),
  )
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-heading">{ENTITIES.leadership.label}</h1>
        <p className="mt-1 text-muted-2">{ENTITIES.leadership.description}</p>
      </div>
      <LeadershipTypeNames labels={typeLabels} />
      <LeadershipQueue rows={queue} />
      <EntityManager entity="leadership" items={serializeRows(rows)} optionLabels={{ kind: kindNames }} />
    </div>
  )
}

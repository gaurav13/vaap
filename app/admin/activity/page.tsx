import { desc } from "drizzle-orm"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { auditLogs, contentRevisions } from "@/lib/db/schema"
import { currentOperator, isSuperAdminActor, REVISION_LABELS, type RevisionEntity } from "@/lib/rbac"
import { RestoreButton } from "@/components/admin/restore-button"

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" })

export default async function AdminActivityPage() {
  const actor = await currentOperator()
  if (!isSuperAdminActor(actor)) redirect("/admin")

  const [logs, revisions] = await Promise.all([
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200),
    db.select().from(contentRevisions).orderBy(desc(contentRevisions.createdAt)).limit(100),
  ])

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-serif text-2xl font-bold text-heading">Activity &amp; Restore</h1>
        <p className="mt-1 text-muted-2">
          Every admin and staff action, plus saved versions of content you can restore if a change was a mistake.
        </p>
      </div>

      <section aria-labelledby="revisions-heading" className="flex flex-col gap-3">
        <h2 id="revisions-heading" className="text-lg font-semibold text-heading">
          Saved versions
        </h2>
        {revisions.length === 0 ? (
          <p className="text-sm text-muted-2">No saved versions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-2">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Saved before</th>
                  <th className="px-4 py-3 font-medium">By</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Restore</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {revisions.map((r) => {
                  const snap = r.snapshot as Record<string, unknown>
                  const title = String(snap.title ?? snap.name ?? snap.displayName ?? `#${r.entityId}`)
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-2">{dateFmt.format(r.createdAt)}</td>
                      <td className="px-4 py-3">{REVISION_LABELS[r.entityType as RevisionEntity] ?? r.entityType}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-heading">{title}</td>
                      <td className="px-4 py-3 capitalize">{r.action}</td>
                      <td className="px-4 py-3">
                        {r.actorName || "Unknown"}
                        <span className="ml-1 text-xs text-muted-2">({r.actorRole === "admin" ? "Super Admin" : "Staff"})</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.restoredAt ? (
                          <span className="text-xs text-muted-2">Restored by {r.restoredBy}</span>
                        ) : (
                          <RestoreButton revisionId={r.id} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="log-heading" className="flex flex-col gap-3">
        <h2 id="log-heading" className="text-lg font-semibold text-heading">
          Activity log
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-2">No activity recorded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-col gap-1 px-4 py-3 text-sm md:flex-row md:items-center md:gap-4">
                <span className="whitespace-nowrap text-muted-2 md:w-44">{dateFmt.format(l.createdAt)}</span>
                <span className="font-medium text-heading md:w-48">
                  {l.actorName || "Unknown"}
                  <span className="ml-1 text-xs font-normal text-muted-2">
                    ({l.actorRole === "admin" ? "Super Admin" : l.actorRole === "staff" ? "Staff" : l.actorRole || "-"})
                  </span>
                </span>
                <span className="text-pretty">
                  <span className="font-medium">{l.action.replaceAll("_", " ")}</span>
                  {l.entityType && (
                    <span className="text-muted-2">
                      {" "}
                      &middot; {l.entityType} {l.entityId && `#${l.entityId}`}
                    </span>
                  )}
                  {(l.target || l.details) && <span className="text-muted-2"> &middot; {l.target || l.details}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

import Link from "next/link"
import { ArrowLeft, Download, ShieldCheck } from "lucide-react"
import { listAuditLogs } from "@/lib/governance-reports"

export const dynamic = "force-dynamic"

function formatTime(value: Date) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function GovernanceAuditPage() {
  const logs = await listAuditLogs({ limit: 500 })

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/governance/reports"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-2 hover:text-heading"
          >
            <ArrowLeft className="size-4" /> Reports
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-heading">
            <ShieldCheck className="size-6 text-green" /> Audit log
          </h1>
          <p className="mt-1 text-sm text-muted-2">
            Immutable record of every governance action. Showing the {logs.length} most recent entries.
          </p>
        </div>
        <a
          href="/api/governance/export/audit"
          className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-green transition-colors hover:bg-mint"
        >
          <Download className="size-4" /> Export CSV
        </a>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card py-16 text-center text-sm text-muted-2">
          No governance activity recorded yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-background text-xs uppercase tracking-wide text-muted-2">
                <tr>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Actor</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Entity</th>
                  <th className="px-4 py-3 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((l) => (
                  <tr key={l.id} className="align-top hover:bg-background">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-2">{formatTime(l.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-heading">{l.actorName || "System"}</div>
                      {l.actorRole ? <div className="text-xs text-muted-2">{l.actorRole}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-mint px-2 py-0.5 font-mono text-xs text-green">
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-2">
                      {l.entityType ? (
                        <span className="font-mono text-xs">
                          {l.entityType}
                          {l.entityId ? `#${l.entityId}` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      {l.detail ? (
                        <code className="block truncate text-xs text-muted-2" title={l.detail}>
                          {l.detail}
                        </code>
                      ) : (
                        <span className="text-muted-2">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

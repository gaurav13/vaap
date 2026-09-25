import Link from "next/link"
import { Plus, Vote, Eye } from "lucide-react"
import { listProposals } from "@/lib/governance"
import { StatusPill } from "@/components/governance/status-pill"

export const dynamic = "force-dynamic"

export default async function AdminGovernancePage() {
  const proposals = await listProposals()

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Proposals &amp; Voting</h1>
          <p className="mt-1 text-sm text-muted-2">
            Create DAO resolutions, run member votes, and anchor results to the XRP Ledger (testnet).
          </p>
        </div>
        <Link
          href="/admin/governance/new"
          className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
        >
          <Plus className="size-4" /> New proposal
        </Link>
      </div>

      {proposals.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-card py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-mint text-green">
            <Vote className="size-6" />
          </span>
          <p className="text-sm text-muted-2">No proposals yet. Create your first resolution to start voting.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-background text-xs uppercase tracking-wide text-muted-2">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {proposals.map((p) => (
                <tr key={p.id} className="hover:bg-background">
                  <td className="px-4 py-3 font-mono text-xs text-muted-2">{p.reference}</td>
                  <td className="px-4 py-3 font-medium text-heading">{p.title}</td>
                  <td className="px-4 py-3 text-muted-2">{p.voteType.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/governance/${p.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-border bg-mint px-3 py-1.5 text-sm font-semibold text-green transition-colors hover:bg-mint/70"
                    >
                      <Eye className="size-3.5" /> View &amp; manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

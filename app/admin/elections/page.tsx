import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession, isStaff } from "@/lib/session"
import { listElections, eligibleVoterCount, participationCount } from "@/lib/elections"
import { StatusPill } from "@/components/governance/status-pill"
import { Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminElectionsPage() {
  const session = await getSession()
  if (!session?.user || !isStaff(session.user.role)) redirect("/dashboard")

  const elections = await listElections()
  const stats = await Promise.all(
    elections.map(async (e) => ({
      eligible: await eligibleVoterCount(e.id),
      turnout: await participationCount(e.id),
    })),
  )

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-heading">Elections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Run secret-ballot elections for VAAP office bearers and committees, anchored on the XRP Ledger.
          </p>
        </div>
        <Link
          href="/admin/elections/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="size-4" />
          New election
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Election</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Eligible</th>
              <th className="px-4 py-3">Turnout</th>
              <th className="px-4 py-3">Closes</th>
            </tr>
          </thead>
          <tbody>
            {elections.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No elections yet. Create your first one to get started.
                </td>
              </tr>
            ) : (
              elections.map((e, i) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/elections/${e.id}`} className="font-medium text-heading hover:underline">
                      {e.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">{e.reference}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={e.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">{stats[i].eligible}</td>
                  <td className="px-4 py-3 tabular-nums">{stats[i].turnout}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.closesAt ? new Date(e.closesAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

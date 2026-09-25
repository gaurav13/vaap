import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { getSession, isStaff } from "@/lib/session"
import {
  getElection,
  eligibleVoterCount,
  participationCount,
  getElectionResults,
  getElectionAnchor,
} from "@/lib/elections"
import { StatusPill } from "@/components/governance/status-pill"
import { CandidateManager } from "@/components/governance/candidate-manager"
import { ElectionAdminControls } from "@/components/governance/election-admin-controls"

export const dynamic = "force-dynamic"

export default async function AdminElectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user || !isStaff(session.user.role)) redirect("/dashboard")

  const { id } = await params
  const detail = await getElection(Number(id))
  if (!detail) notFound()
  const { election, positions, candidates } = detail

  const [eligible, turnout, results, anchor] = await Promise.all([
    eligibleVoterCount(election.id),
    participationCount(election.id),
    getElectionResults(election.id),
    getElectionAnchor(election.id),
  ])

  const editable = election.status === "draft" || election.status === "published"
  const showResults = election.status === "results_published" || election.status === "closed"

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/admin/elections"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-heading"
      >
        <ArrowLeft className="size-4" />
        Back to elections
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl text-heading">{election.title}</h1>
            <StatusPill status={election.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{election.reference}</p>
          {election.description && <p className="mt-3 max-w-2xl text-sm text-foreground">{election.description}</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Eligible voters</p>
          <p className="mt-1 font-serif text-2xl text-heading tabular-nums">{eligible}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ballots cast</p>
          <p className="mt-1 font-serif text-2xl text-heading tabular-nums">{turnout}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Turnout</p>
          <p className="mt-1 font-serif text-2xl text-heading tabular-nums">
            {eligible > 0 ? Math.round((turnout / eligible) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/20 p-5">
        <h2 className="text-sm font-medium text-heading">Manage election</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Opening voting freezes the eligible-voter register. Publishing results computes the tally and anchors the
          result hash on the XRP Ledger.
        </p>
        <div className="mt-4">
          <ElectionAdminControls id={election.id} status={election.status} />
        </div>
      </div>

      {showResults && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-heading">Results</h2>
            {anchor?.txHash ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <ShieldCheck className="size-3.5" />
                XRPL verified
              </span>
            ) : anchor ? (
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Anchoring…</span>
            ) : null}
          </div>
          <div className="mt-4 space-y-5">
            {positions.map((pos) => {
              const posResults = results
                .filter((r) => r.positionId === pos.id)
                .sort((a, b) => b.votes - a.votes)
              return (
                <div key={pos.id}>
                  <h3 className="text-sm font-medium text-heading">{pos.title}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {posResults.map((r) => {
                      const candidate = candidates.find((c) => c.id === r.candidateId)
                      return (
                        <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className={r.isWinner ? "font-medium text-heading" : "text-foreground"}>
                            {candidate?.name ?? "—"}
                            {r.isWinner && <span className="ml-2 text-xs text-primary">Elected</span>}
                          </span>
                          <span className="tabular-nums text-muted-foreground">{r.votes}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
          {anchor?.resultHash && (
            <p className="mt-4 break-all rounded-lg bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
              Result hash: {anchor.resultHash}
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-serif text-xl text-heading">Positions &amp; candidates</h2>
        {!editable && (
          <p className="mt-1 text-xs text-muted-foreground">
            Candidates are locked once voting has opened.
          </p>
        )}
        <div className="mt-4">
          <CandidateManager
            electionId={election.id}
            positions={positions}
            candidates={candidates}
            editable={editable}
          />
        </div>
      </div>
    </div>
  )
}

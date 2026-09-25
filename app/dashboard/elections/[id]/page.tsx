import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { getSession } from "@/lib/session"
import {
  getElection,
  isVoterEligible,
  getMemberBallot,
  getElectionResults,
  getElectionAnchor,
} from "@/lib/elections"
import { getMemberByUserId } from "@/lib/governance"
import { StatusPill } from "@/components/governance/status-pill"
import { BallotForm } from "@/components/governance/ballot-form"

export const dynamic = "force-dynamic"

export default async function MemberElectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const detail = await getElection(Number(id))
  if (!detail) notFound()
  const { election, positions, candidates } = detail

  const member = await getMemberByUserId(session.user.id)
  const eligible = member ? await isVoterEligible(election.id, member.id) : false
  const ballot = member ? await getMemberBallot(election.id, member.id) : null

  const showResults = election.status === "results_published"
  const results = showResults ? await getElectionResults(election.id) : []
  const anchor = showResults ? await getElectionAnchor(election.id) : null

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/dashboard/elections"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-heading"
      >
        <ArrowLeft className="size-4" />
        All elections
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="font-serif text-2xl text-heading text-balance">{election.title}</h1>
        <StatusPill status={election.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{election.reference}</p>
      {election.description && <p className="mt-3 text-sm text-foreground">{election.description}</p>}

      <div className="mt-8">
        {election.status === "active" && eligible && (
          <BallotForm
            electionId={election.id}
            positions={positions}
            candidates={candidates}
            alreadyVoted={!!ballot}
            existingToken={ballot?.ballotToken ?? null}
          />
        )}

        {election.status === "active" && !eligible && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            You are not on the eligible-voter register for this election.
          </div>
        )}

        {showResults && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-heading">Results</h2>
              {anchor?.txHash && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <ShieldCheck className="size-3.5" />
                  XRPL verified
                </span>
              )}
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
          </div>
        )}

        {(election.status === "closed" || election.status === "draft" || election.status === "published") && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {election.status === "closed"
              ? "Voting has closed. Results will be published shortly."
              : "This election has not opened for voting yet."}
          </div>
        )}
      </div>
    </div>
  )
}

import Link from "next/link"
import { listElections, getElection, getElectionResults, getElectionAnchor } from "@/lib/elections"
import { StatusPill } from "@/components/governance/status-pill"
import { explorerUrl } from "@/lib/xrpl-network"

export const dynamic = "force-dynamic"


export const metadata = {
  title: "Elections | VAAP Governance",
  description: "Public register of VAAP office-bearer elections and their verified results.",
}

export default async function PublicElectionsPage() {
  const elections = await listElections({
    statuses: ["active", "closed", "results_published", "archived"],
  })

  const detailed = await Promise.all(
    elections.map(async (e) => {
      const [details, results, anchor] = await Promise.all([
        getElection(e.id),
        e.status === "results_published" || e.status === "archived" ? getElectionResults(e.id) : Promise.resolve(null),
        getElectionAnchor(e.id),
      ])
      return { election: e, details, results, anchorHash: anchor?.txHash ?? null }
    }),
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-green">VAAP Governance</p>
        <h1 className="mt-2 text-pretty text-3xl font-bold text-foreground sm:text-4xl">Elections Register</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          A public, tamper-evident record of VAAP office-bearer elections. Ballots are secret; only aggregate results
          are published. Where a result has been anchored to the XRP Ledger, a verification link is shown.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/voting/proposals" className="font-medium text-green hover:underline">
            Proposals &amp; resolutions
          </Link>
          <Link href="/voting/verify" className="font-medium text-green hover:underline">
            Verify a receipt
          </Link>
        </div>
      </header>

      {detailed.length === 0 ? (
        <p className="rounded-xl border border-border bg-muted/30 p-8 text-center text-muted-foreground">
          No elections have been published yet.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {detailed.map(({ election, details, results, anchorHash }) => (
            <article key={election.id} className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground text-balance">{election.title}</h2>
                  {election.reference && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{election.reference}</p>
                  )}
                </div>
                <StatusPill status={election.status} />
              </div>

              {election.description && (
                <p className="mt-3 leading-relaxed text-muted-foreground">{election.description}</p>
              )}

              {results && details ? (
                <div className="mt-5 flex flex-col gap-5">
                  {details.positions.map((position) => {
                    const positionResults = results
                      .filter((r) => r.positionId === position.id)
                      .sort((a, b) => b.votes - a.votes)
                    return (
                      <div key={position.id}>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          {position.title}
                        </h3>
                        <ul className="mt-2 flex flex-col gap-1.5">
                          {positionResults.map((r) => {
                            const candidate = details.candidates.find((c) => c.id === r.candidateId)
                            return (
                              <li
                                key={r.id}
                                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                              >
                                <span className="flex items-center gap-2 font-medium text-foreground">
                                  {candidate?.name ?? "Unknown"}
                                  {r.isWinner && (
                                    <span className="rounded-full bg-green/10 px-2 py-0.5 text-xs font-semibold text-green">
                                      Elected
                                    </span>
                                  )}
                                </span>
                                <span className="tabular-nums text-muted-foreground">{r.votes} votes</span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  {election.status === "active"
                    ? "Voting is currently open. Results will be published once voting closes and the count is verified."
                    : "Results are pending publication."}
                </p>
              )}

              {anchorHash && (
                <a
                  href={explorerUrl(anchorHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-green/30 bg-green/5 px-3 py-2 text-sm font-medium text-green hover:bg-green/10"
                >
                  XRPL Verified — view on ledger
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

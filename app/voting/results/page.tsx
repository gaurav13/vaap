import Link from "next/link"
import { ArrowRight, ExternalLink, Search, ShieldCheck, Users } from "lucide-react"
import { getPublicProposalGroups } from "@/lib/governance-public"
import { getProposalAnchor, getProposalResult } from "@/lib/governance"
import { explorerUrl } from "@/lib/xrpl"
import { getActiveNetwork } from "@/lib/xrpl-config"
import { StatusPill } from "@/components/governance/status-pill"
import { proposalBannerSrc } from "@/components/governance/public-proposal-card"
import { EmptyVotingState, VotingSectionShell } from "@/components/governance/voting-section-shell"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Voting Results | VAAP Voting",
  description:
    "The public record of completed VAAP votes, their outcomes, and results anchored to the XRP Ledger for independent verification.",
}

export default async function VotingResultsPage() {
  const [{ completed }, network] = await Promise.all([getPublicProposalGroups(), getActiveNetwork()])
  const rows = await Promise.all(
    completed.map(async (card) => {
      const [result, anchor] = await Promise.all([
        getProposalResult(card.proposal.id),
        getProposalAnchor(card.proposal.id),
      ])
      return { card, result, anchorHash: anchor?.txHash ?? null }
    }),
  )

  return (
    <VotingSectionShell
      currentHref="/voting/results"
      title="Voting Results"
      description="The public record of every completed VAAP vote and its outcome. Results are anchored on the XRP Ledger so anyone can independently verify they have not been altered."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-green">
          <ShieldCheck className="size-3.5" /> XRP Ledger · {network}
        </span>
        <Link
          href="/voting/verify"
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-semibold text-heading transition-colors hover:bg-background"
        >
          <Search className="size-4" /> Verify a vote receipt
        </Link>
        <Link href="/voting/elections" className="text-sm font-semibold text-green hover:underline">
          View election results
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyVotingState message="No completed votes yet. Results will appear here once voting closes." />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ card, result, anchorHash }) => {
            const p = card.proposal
            return (
              <article
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-shadow hover:shadow-md md:flex-row"
              >
                <Link
                  href={`/voting/proposals/${p.id}`}
                  className="relative block aspect-video w-full shrink-0 overflow-hidden border-b border-line bg-mint-2 md:w-80 md:border-b-0 md:border-r"
                  aria-label={`Open ${p.title}`}
                  tabIndex={-1}
                >
                  <img
                    src={proposalBannerSrc(p) || "/placeholder.svg"}
                    alt={p.bannerImageUrl ? `${p.title} banner` : ""}
                    className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </Link>
                <div className="min-w-0 flex-1 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {p.reference && <p className="font-mono text-xs text-muted-2">{p.reference}</p>}
                    <h2 className="text-lg font-bold text-heading text-balance">
                      <Link href={`/voting/proposals/${p.id}`} className="hover:text-green">
                        {p.title}
                      </Link>
                    </h2>
                  </div>
                  <StatusPill status={result?.outcome ?? p.status} />
                </div>
                {p.summary && <p className="mt-2 text-sm leading-relaxed text-muted-2">{p.summary}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-4 text-sm">
                  {result ? (
                    p.voteType === "yes_no_abstain" ? (
                      <>
                        <Metric label="Yes" value={result.yesCount} />
                        <Metric label="No" value={result.noCount} />
                        <Metric label="Abstain" value={result.abstainCount} />
                      </>
                    ) : (
                      <Metric label="Total votes" value={result.totalVotes} />
                    )
                  ) : (
                    <span className="text-xs text-muted-2">Results pending publication</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-2">
                    <Users className="size-3.5" /> {card.voteCount} / {card.eligibleCount} voted ·{" "}
                    {card.turnout.toFixed(0)}%
                  </span>

                  <div className="ml-auto flex flex-wrap items-center gap-4">
                    {anchorHash && (
                      <a
                        href={explorerUrl(anchorHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-green hover:underline"
                      >
                        Verify on XRPL <ExternalLink className="size-3.5" />
                      </a>
                    )}
                    <Link
                      href={`/voting/proposals/${p.id}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-heading hover:text-green"
                    >
                      View details <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </VotingSectionShell>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-base font-bold text-heading">{value}</span>
      <span className="text-xs text-muted-2">{label}</span>
    </span>
  )
}

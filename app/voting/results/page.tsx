import Link from "next/link"
import { getPublicProposalGroups } from "@/lib/governance-public"
import { PublicProposalCard } from "@/components/governance/public-proposal-card"
import { EmptyVotingState, VotingSectionShell } from "@/components/governance/voting-section-shell"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Voting Results | VAAP Voting",
  description: "Completed VAAP governance votes and their XRPL-anchored results.",
}

export default async function VotingResultsPage() {
  const { completed } = await getPublicProposalGroups()
  return (
    <VotingSectionShell
      currentHref="/voting/results"
      title="Voting Results"
      description="Completed votes and their published outcomes. Results are anchored on the XRP Ledger for independent verification."
    >
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <Link href="/voting/elections" className="font-semibold text-green hover:underline">
          View election results
        </Link>
        <Link href="/voting/verify" className="font-semibold text-green hover:underline">
          Verify a vote receipt
        </Link>
      </div>
      {completed.length === 0 ? (
        <EmptyVotingState message="No completed votes yet. Results will appear here once voting closes." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {completed.map((c) => (
            <PublicProposalCard key={c.proposal.id} card={c} />
          ))}
        </div>
      )}
    </VotingSectionShell>
  )
}

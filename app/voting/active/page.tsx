import { getPublicProposalGroups } from "@/lib/governance-public"
import { PublicProposalCard } from "@/components/governance/public-proposal-card"
import { EmptyVotingState, VotingSectionShell } from "@/components/governance/voting-section-shell"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Active Votes | VAAP Voting",
  description: "VAAP governance proposals currently open for member voting.",
}

export default async function ActiveVotesPage() {
  const { open } = await getPublicProposalGroups()
  return (
    <VotingSectionShell
      currentHref="/voting/active"
      title="Active Votes"
      description="Proposals currently open for voting. Eligible members can sign in and cast their vote before the deadline."
    >
      {open.length === 0 ? (
        <EmptyVotingState message="No votes are open right now. Check Upcoming Votes for what's scheduled next." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {open.map((c) => (
            <PublicProposalCard key={c.proposal.id} card={c} />
          ))}
        </div>
      )}
    </VotingSectionShell>
  )
}

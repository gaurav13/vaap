import { getPublicProposalGroups } from "@/lib/governance-public"
import { PublicProposalCard } from "@/components/governance/public-proposal-card"
import { EmptyVotingState, VotingSectionShell } from "@/components/governance/voting-section-shell"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Upcoming Votes | VAAP Voting",
  description: "Scheduled VAAP governance votes that will open soon.",
}

export default async function UpcomingVotesPage() {
  const { upcoming } = await getPublicProposalGroups()
  return (
    <VotingSectionShell
      currentHref="/voting/upcoming"
      title="Upcoming Votes"
      description="Proposals that have been published and are scheduled to open for voting. Review them ahead of time."
    >
      {upcoming.length === 0 ? (
        <EmptyVotingState message="No votes are scheduled at the moment." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {upcoming.map((c) => (
            <PublicProposalCard key={c.proposal.id} card={c} />
          ))}
        </div>
      )}
    </VotingSectionShell>
  )
}

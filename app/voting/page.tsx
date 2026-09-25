import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { getGovernanceStats, getPublicProposalGroups } from "@/lib/governance-public"
import { VotingHero } from "@/components/governance/voting-hero"
import { VotingStats } from "@/components/governance/voting-stats"
import { VotingBoard } from "@/components/governance/voting-board"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Voting | VAAP",
  description:
    "Transparent, member-led, blockchain-verified governance. View active votes, upcoming proposals and completed results anchored to the XRP Ledger.",
}

export default async function VotingHubPage() {
  const [user, stats, groups] = await Promise.all([getHeaderUser(), getGovernanceStats(), getPublicProposalGroups()])

  return (
    <>
      <SiteHeaderServer active="Voting" user={user} />
      <main className="bg-mint-2/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:py-8">
          <VotingHero />
          <VotingStats stats={stats} />
          <VotingBoard open={groups.open} upcoming={groups.upcoming} completed={groups.completed} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

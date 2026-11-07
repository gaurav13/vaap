import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { getGovernanceStats, getPublicProposalGroups } from "@/lib/governance-public"
import { VotingHero } from "@/components/governance/voting-hero"
import { VotingStats } from "@/components/governance/voting-stats"
import { VotingBoard } from "@/components/governance/voting-board"
import { seoMetadata } from "@/lib/seo"
import { staticSubjectByPath } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"

export const dynamic = "force-dynamic"

export function generateMetadata() {
  return seoMetadata(staticSubjectByPath('/voting'))
}

export default async function VotingHubPage() {
  const [user, stats, groups] = await Promise.all([getHeaderUser(), getGovernanceStats(), getPublicProposalGroups()])

  return (
    <>
      <SeoJsonLd subject={staticSubjectByPath('/voting')} />
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
    </>
  )
}

import Link from "next/link"
import { ArrowRight, ShieldCheck, Vote as VoteIcon } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { getGovernanceStats, getPublicProposalGroups } from "@/lib/governance-public"
import { PublicProposalCard } from "@/components/governance/public-proposal-card"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Governance | VAAP",
  description:
    "Transparent, member-led, blockchain-verified governance. View active votes, upcoming proposals and completed results anchored to the XRP Ledger.",
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 text-center">
      <p className="font-mono text-3xl font-bold tabular-nums text-heading">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-2">{label}</p>
    </div>
  )
}

export default async function GovernanceHubPage() {
  const [user, stats, groups] = await Promise.all([
    getHeaderUser(),
    getGovernanceStats(),
    getPublicProposalGroups(),
  ])
  const fmt = (n: number) => n.toLocaleString("en-US")

  return (
    <>
      <SiteHeaderServer active="Voting" user={user} />
      <main>
        {/* Hero */}
        <section className="border-b border-line bg-gradient-to-b from-mint/40 to-background">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <p className="inline-flex items-center gap-2 rounded-full border border-green-border bg-mint px-3 py-1 text-xs font-semibold text-green">
              <ShieldCheck className="size-3.5" /> VAAP Governance
            </p>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-bold leading-tight text-heading sm:text-5xl">
              Transparent. Member-Led. Blockchain Verified.
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-2">
              Every VAAP proposal, vote and election result is recorded and anchored to the XRP Ledger — open for anyone
              to inspect and independently verify.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/voting/proposals"
                className="inline-flex items-center gap-2 rounded-lg bg-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
              >
                <VoteIcon className="size-4" /> Browse all proposals
              </Link>
              <Link
                href="/voting/verify"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-background px-5 py-3 text-sm font-semibold text-heading transition-colors hover:bg-card"
              >
                Verify a vote record
              </Link>
              <Link
                href="/governance"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-background px-5 py-3 text-sm font-semibold text-heading transition-colors hover:bg-card"
              >
                About VAAP governance
              </Link>
            </div>
          </div>
        </section>

        {/* Live statistics */}
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Active Votes" value={fmt(stats.activeVotes)} />
            <StatCard label="Eligible Members" value={fmt(stats.eligibleMembers)} />
            <StatCard label="Total Votes Cast" value={fmt(stats.totalVotesCast)} />
            <StatCard label="Active Elections" value={fmt(stats.activeElections)} />
            <StatCard label="XRPL Verified Records" value={fmt(stats.xrplVerifiedRecords)} />
          </div>
        </section>

        {/* Open for voting */}
        <Section
          title="Open for voting"
          subtitle="Cast your vote before these proposals close."
          empty="There are no proposals open for voting right now."
          cards={groups.open}
        />

        {/* Upcoming */}
        <Section
          title="Upcoming votes"
          subtitle="Published proposals that will open for voting soon."
          empty="No upcoming votes are scheduled."
          cards={groups.upcoming}
        />

        {/* Completed */}
        <Section
          title="Completed votes"
          subtitle="Closed proposals with published, blockchain-anchored results."
          empty="No completed votes yet."
          cards={groups.completed}
          viewAll="/voting/results"
        />
      </main>
      <SiteFooter />
    </>
  )
}

function Section({
  title,
  subtitle,
  empty,
  cards,
  viewAll,
}: {
  title: string
  subtitle: string
  empty: string
  cards: Awaited<ReturnType<typeof getPublicProposalGroups>>["open"]
  viewAll?: string
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-heading">{title}</h2>
          <p className="mt-1 text-sm text-muted-2">{subtitle}</p>
        </div>
        {viewAll && cards.length > 0 && (
          <Link href={viewAll} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-green hover:underline">
            View all <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
      {cards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-muted-2">
          {empty}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <PublicProposalCard key={c.proposal.id} card={c} />
          ))}
        </div>
      )}
    </section>
  )
}

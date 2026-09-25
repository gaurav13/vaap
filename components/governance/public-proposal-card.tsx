import Link from "next/link"
import { ArrowRight, Users } from "lucide-react"
import { StatusPill } from "@/components/governance/status-pill"
import { VoteCountdown } from "@/components/governance/vote-countdown"
import type { PublicProposalCard as CardData } from "@/lib/governance-public"

export function PublicProposalCard({ card }: { card: CardData }) {
  const { proposal, eligibleCount, voteCount, turnout } = card
  const isOpen = proposal.status === "active"
  const isUpcoming = proposal.status === "published"

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-green">{proposal.category}</span>
        <StatusPill status={proposal.status} />
      </div>

      <h3 className="mt-3 text-balance text-lg font-bold leading-snug text-heading">
        <Link href={`/voting/proposals/${proposal.id}`} className="hover:text-green">
          {proposal.title}
        </Link>
      </h3>
      {proposal.reference && <p className="mt-1 font-mono text-xs text-muted-2">{proposal.reference}</p>}

      {proposal.summary && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-2">{proposal.summary}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {isOpen && proposal.closesAt && (
          <div className="rounded-xl border border-line bg-background p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-2">Closes in</p>
            <VoteCountdown closesAt={new Date(proposal.closesAt).toISOString()} compact />
          </div>
        )}

        {(isOpen || card.voteCount > 0) && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-2">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" /> {voteCount} / {eligibleCount} voted
              </span>
              <span className="font-semibold text-heading">{turnout.toFixed(0)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-green" style={{ width: `${Math.min(turnout, 100)}%` }} />
            </div>
          </div>
        )}

        {isUpcoming && proposal.opensAt && (
          <p className="text-xs text-muted-2">
            Opens {new Date(proposal.opensAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>

      <Link
        href={`/voting/proposals/${proposal.id}`}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:gap-2.5 transition-all"
      >
        {isOpen ? "View & vote" : "View details"} <ArrowRight className="size-4" />
      </Link>
    </article>
  )
}

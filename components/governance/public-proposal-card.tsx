import Link from "next/link"
import { ArrowRight, CalendarClock, ExternalLink, Users } from "lucide-react"
import { StatusPill } from "@/components/governance/status-pill"
import { ClosesIn } from "@/components/governance/closes-in"
import type { PublicProposalCard as CardData } from "@/lib/governance-public"

const ILLUSTRATIONS = ["/images/vote-card-document.png", "/images/vote-card-ballot.png"]

export function PublicProposalCard({ card, emphasis = false }: { card: CardData; emphasis?: boolean }) {
  const { proposal, eligibleCount, voteCount, turnout } = card
  const isOpen = proposal.status === "active"
  const isUpcoming = proposal.status === "published"
  const href = `/voting/proposals/${proposal.id}`
  const image = proposal.bannerImageUrl || ILLUSTRATIONS[proposal.id % ILLUSTRATIONS.length]
  const cta = isOpen ? "View & Vote" : isUpcoming ? "View Proposal" : "View Results"

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition-shadow hover:shadow-lg">
      <Link href={href} className="block aspect-[16/9] w-full overflow-hidden border-b border-line bg-mint-2">
        <img
          src={image || "/placeholder.svg"}
          alt={proposal.bannerImageUrl ? `${proposal.title} banner` : ""}
          className={`h-full w-full transition-transform duration-300 group-hover:scale-[1.02] ${
            proposal.bannerImageUrl ? "object-contain" : "object-cover"
          }`}
        />
      </Link>
      <div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-green">{proposal.category}</span>
            <StatusPill status={proposal.status} />
          </div>
          <h3 className="mt-3 font-serif text-2xl font-bold leading-tight text-heading">
            <Link href={href} className="hover:text-green">
              {proposal.title}
            </Link>
          </h3>
          {proposal.reference && <p className="mt-1 font-mono text-xs text-muted-2">{proposal.reference}</p>}
          {proposal.summary && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-2">{proposal.summary}</p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
        {isOpen && proposal.closesAt && <ClosesIn closesAt={new Date(proposal.closesAt).toISOString()} />}

        {isUpcoming && proposal.opensAt && (
          <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold-tint p-3">
            <CalendarClock className="size-6 shrink-0 text-green" aria-hidden />
            <div>
              <p className="text-xs text-muted-2">Opens for voting</p>
              <p className="text-sm font-semibold text-heading">
                {new Date(proposal.opensAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Karachi",
                })}{" "}
                (PKT)
              </p>
            </div>
          </div>
        )}

        {(isOpen || voteCount > 0) && (
          <div className="rounded-xl border border-line p-3">
            <div className="flex items-center justify-between text-sm text-muted-2">
              <span className="inline-flex items-center gap-2">
                <Users className="size-4 text-green" aria-hidden /> {voteCount} / {eligibleCount} voted
              </span>
              <span className="font-semibold text-heading">{turnout.toFixed(0)}%</span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuenow={Math.round(turnout)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Turnout"
            >
              <div className="h-full rounded-full bg-green" style={{ width: `${Math.min(turnout, 100)}%` }} />
            </div>
          </div>
        )}

        <Link
          href={href}
          className={`mt-auto flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
            emphasis
              ? "bg-green text-white hover:bg-green-hover"
              : "border border-green-border bg-mint-2 text-green hover:bg-mint"
          }`}
        >
          <span className="size-4" aria-hidden />
          <span className="inline-flex items-center gap-2">
            {cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
          <ExternalLink className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  )
}

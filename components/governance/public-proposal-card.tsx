import Link from "next/link"
import { ArrowRight, CalendarClock, Users } from "lucide-react"
import { StatusPill } from "@/components/governance/status-pill"
import { ClosesIn } from "@/components/governance/closes-in"
import type { PublicProposalCard as CardData } from "@/lib/governance-public"

const ILLUSTRATIONS = ["/images/vote-card-document.png", "/images/vote-card-ballot.png"]

export function PublicProposalCard({ card, emphasis = false }: { card: CardData; emphasis?: boolean }) {
  const { proposal, eligibleCount, voteCount, turnout } = card
  const isOpen = proposal.status === "active"
  const isUpcoming = proposal.status === "published"
  const href = `/voting/proposals/${proposal.id}`
  const hasBanner = Boolean(proposal.bannerImageUrl)
  const image = proposal.bannerImageUrl || ILLUSTRATIONS[proposal.id % ILLUSTRATIONS.length]
  const cta = isOpen ? "View & Vote" : isUpcoming ? "View Proposal" : "View Results"

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        href={href}
        className="relative block aspect-[16/9] w-full overflow-hidden bg-mint-2"
        aria-label={`Open ${proposal.title}`}
      >
        {hasBanner && (
          <img
            src={image || "/placeholder.svg"}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
          />
        )}
        <img
          src={image || "/placeholder.svg"}
          alt={hasBanner ? `${proposal.title} banner` : ""}
          className={`relative h-full w-full transition-transform duration-500 group-hover:scale-[1.03] ${
            hasBanner ? "object-contain" : "object-cover"
          }`}
        />
        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-card/95 px-3 py-1 text-xs font-semibold text-green shadow-sm backdrop-blur">
            {proposal.category}
          </span>
          <StatusPill status={proposal.status} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {proposal.reference && (
          <p className="font-mono text-xs uppercase tracking-wide text-muted-2">{proposal.reference}</p>
        )}
        <h3 className="mt-1.5 text-pretty font-serif text-xl font-bold leading-snug text-heading">
          <Link href={href} className="transition-colors hover:text-green">
            {proposal.title}
          </Link>
        </h3>
        {proposal.summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-2">{proposal.summary}</p>
        )}

        <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4">
          {isOpen && proposal.closesAt && <ClosesIn closesAt={new Date(proposal.closesAt).toISOString()} />}

          {isUpcoming && proposal.opensAt && (
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
                <CalendarClock className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-2">Opens for voting</p>
                <p className="text-sm text-heading">
                  {new Date(proposal.opensAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Karachi",
                  })}{" "}
                  PKT
                </p>
              </div>
            </div>
          )}

          {(isOpen || voteCount > 0) && (
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-muted-2">
                  <Users className="size-4 text-green" aria-hidden />
                  <span>
                    <span className="font-semibold text-heading">{voteCount}</span> of {eligibleCount} members voted
                  </span>
                </span>
                <span className="font-semibold tabular-nums text-heading">{turnout.toFixed(0)}%</span>
              </div>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line"
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
        </div>

        <Link
          href={href}
          className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            emphasis
              ? "bg-green text-white hover:bg-green-hover"
              : "border border-green-border text-green hover:bg-mint"
          }`}
        >
          {cta}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </article>
  )
}

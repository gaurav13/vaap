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
  const hasBanner = Boolean(proposal.bannerImageUrl)
  const image = proposal.bannerImageUrl || ILLUSTRATIONS[proposal.id % ILLUSTRATIONS.length]
  const cta = isOpen ? "View & Vote" : isUpcoming ? "View Proposal" : "View Results"

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={href}
        className="relative block aspect-video w-full overflow-hidden border-b border-line bg-mint-2"
        aria-label={`Open ${proposal.title}`}
        tabIndex={-1}
      >
        <img
          src={image || "/placeholder.svg"}
          alt={hasBanner ? `${proposal.title} banner` : ""}
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gold-tint px-3 py-1 text-xs font-semibold text-heading">
                {proposal.category}
              </span>
              <StatusPill status={proposal.status} />
            </div>
            <Link
              href={href}
              className="rounded-md p-1 text-green transition-colors hover:bg-mint"
              aria-label={`Open ${proposal.title}`}
            >
              <ExternalLink className="size-5" aria-hidden />
            </Link>
          </div>

          <h3 className="mt-3 text-pretty font-serif text-2xl font-bold leading-tight text-heading">
            <Link href={href} className="transition-colors hover:text-green">
              {proposal.title}
            </Link>
          </h3>
          {proposal.reference && <p className="mt-1 text-sm text-muted-2">{proposal.reference}</p>}
        </div>

        {isOpen && proposal.closesAt && <ClosesIn closesAt={new Date(proposal.closesAt).toISOString()} />}

        {isUpcoming && proposal.opensAt && (
          <div className="flex items-center gap-3.5 rounded-xl border border-green-border bg-mint px-4 py-3">
            <CalendarClock className="size-8 shrink-0 text-green" strokeWidth={1.75} aria-hidden />
            <div>
              <p className="text-sm text-body">Opens for voting</p>
              <p className="text-base font-bold text-heading">
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
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-body">
                <Users className="size-4 text-green" aria-hidden />
                {voteCount} / {eligibleCount} voted
              </span>
              <span className="font-bold tabular-nums text-heading">{turnout.toFixed(0)}%</span>
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
          className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
            emphasis
              ? "bg-green text-primary-foreground hover:bg-green-hover"
              : "border border-green text-green hover:bg-mint"
          }`}
        >
          {cta}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </article>
  )
}

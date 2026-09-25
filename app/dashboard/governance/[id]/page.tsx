import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, CheckCircle2, ExternalLink, Users, Layers, Percent, ShieldCheck, Calendar } from "lucide-react"
import { getSession } from "@/lib/session"
import {
  getProposal,
  getMemberByUserId,
  getMemberVote,
  isMemberEligible,
  eligibleMemberIds,
  getProposalResult,
  getProposalAnchor,
  proposalVoteCount,
} from "@/lib/governance"
import { explorerUrl } from "@/lib/xrpl"
import { StatusPill } from "@/components/governance/status-pill"
import { VoteForm } from "@/components/governance/vote-form"

export const dynamic = "force-dynamic"

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

export default async function MemberProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) notFound()

  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const data = await getProposal(id)
  if (!data) notFound()
  const { proposal, options } = data

  const member = await getMemberByUserId(session.user.id)
  const eligibleVoter = (member?.votingEligible ?? false) && member?.status === "active"
  const onList = member ? await isMemberEligible(proposal, member.id) : false
  const existing = member ? await getMemberVote(id, member.id) : null

  const showResults =
    proposal.status === "closed" || proposal.status === "results_published" || proposal.status === "archived"
  const [result, voteCount, eligible] = await Promise.all([
    showResults ? getProposalResult(id) : Promise.resolve(null),
    proposalVoteCount(id),
    eligibleMemberIds(proposal),
  ])
  const eligibleCount = eligible.length
  const turnout = eligibleCount > 0 ? Math.round((voteCount / eligibleCount) * 100) : 0
  const optionTally: Record<string, number> = result?.optionTally ? JSON.parse(result.optionTally) : {}
  const anchor = showResults ? await getProposalAnchor(id) : null
  const anchorHash = anchor?.txHash ?? null

  const canVote = proposal.status === "active" && eligibleVoter && onList && !existing

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/dashboard/governance"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-2 hover:text-heading"
      >
        <ArrowLeft className="size-4" /> Back to governance
      </Link>

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-2">{proposal.reference}</p>
          <h1 className="text-2xl font-bold text-heading text-balance">{proposal.title}</h1>
          {proposal.summary && <p className="mt-2 text-sm text-muted-2">{proposal.summary}</p>}
        </div>
        <StatusPill status={proposal.status} />
      </div>

      {/* Meta chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        <MetaChip icon={<Layers className="size-3.5" />} label="Category" value={proposal.category || "Resolution"} />
        <MetaChip icon={<ShieldCheck className="size-3.5" />} label="Vote type" value={proposal.voteType.replace(/_/g, " ")} />
        <MetaChip icon={<Percent className="size-3.5" />} label="Quorum" value={`${proposal.quorum}%`} />
        <MetaChip icon={<Percent className="size-3.5" />} label="Pass at" value={`${proposal.passThreshold}%`} />
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-heading">Read the full proposal</p>
          <p className="text-sm text-muted-2">
            View the complete proposal page with background, documents, timeline, and live results.
          </p>
        </div>
        <Link
          href={`/voting/proposals/${proposal.id}`}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Open proposal page <ExternalLink className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Description */}
      {proposal.description && (
        <div className="mb-6 rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-2 text-base font-bold text-heading">Resolution text</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-2">{proposal.description}</p>
        </div>
      )}

      {/* Participation */}
      <div className="mb-6 rounded-2xl border border-line bg-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-base font-bold text-heading">
            <Users className="size-4 text-green" /> Participation
          </h2>
          <span className="text-sm font-semibold text-heading">
            {voteCount} / {eligibleCount} voted
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-green transition-all" style={{ width: `${Math.min(turnout, 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-2">
          {turnout}% turnout of eligible voters{proposal.quorum > 0 ? ` · quorum ${proposal.quorum}%` : ""}
        </p>
      </div>

      {/* Your vote receipt */}
      {existing && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-border bg-mint p-5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green" />
          <div>
            <p className="font-semibold text-heading">Your vote is recorded</p>
            <p className="mt-1 text-sm text-muted-2">
              Receipt code:{" "}
              <Link
                href={`/voting/verify?code=${existing.receiptCode}`}
                className="font-mono font-semibold text-green hover:underline"
              >
                {existing.receiptCode}
              </Link>
            </p>
            {existing.xrplStatus === "verified" && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green">
                <CheckCircle2 className="size-3.5" /> Anchored on the XRP Ledger
              </p>
            )}
          </div>
        </div>
      )}

      {/* Vote form */}
      {canVote && (
        <VoteForm
          proposalId={id}
          voteType={proposal.voteType}
          options={options.map((o) => ({ id: o.id, label: o.label }))}
        />
      )}

      {!canVote && !existing && proposal.status === "active" && (
        <div className="rounded-2xl border border-line bg-card p-5 text-sm text-muted-2">
          {!eligibleVoter
            ? "You are not currently an eligible voter."
            : !onList
              ? "You are not on the eligibility list for this particular vote."
              : "Voting is not available."}
        </div>
      )}

      {/* Results */}
      {showResults && result && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-heading">Result</h2>
            <StatusPill status={result.outcome} />
          </div>
          {proposal.voteType === "yes_no_abstain" ? (
            <div className="grid grid-cols-3 gap-3">
              <Tally label="Yes" value={result.yesCount} highlight />
              <Tally label="No" value={result.noCount} />
              <Tally label="Abstain" value={result.abstainCount} />
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {options.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-heading">{o.label}</span>
                  <span className="font-semibold text-heading">{optionTally[String(o.id)] ?? 0}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-2">{voteCount} vote(s) cast.</p>
          {anchorHash && (
            <a
              href={explorerUrl(anchorHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:underline"
            >
              Verify result on XRPL <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="mt-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="mb-3 inline-flex items-center gap-2 text-base font-bold text-heading">
          <Calendar className="size-4 text-green" /> Timeline
        </h2>
        <ul className="flex flex-col gap-2 text-sm">
          <TimelineRow label="Published" value={fmtDate(proposal.publishedAt)} />
          <TimelineRow label="Voting opened" value={fmtDate(proposal.opensAt)} />
          <TimelineRow label="Voting closed" value={fmtDate(proposal.closedAt)} />
        </ul>
      </div>
    </div>
  )
}

function MetaChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs text-muted-2">
      <span className="text-green">{icon}</span>
      <span className="font-medium text-heading capitalize">{value}</span>
      <span className="text-muted-2">{label}</span>
    </span>
  )
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-2">{label}</span>
      <span className="font-medium text-heading">{value}</span>
    </li>
  )
}

function Tally({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 text-center ${highlight ? "border-green-border bg-mint" : "border-line bg-background"}`}
    >
      <p className="text-2xl font-bold text-heading">{value}</p>
      <p className="mt-0.5 text-xs text-muted-2">{label}</p>
    </div>
  )
}

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react"
import { getSession } from "@/lib/session"
import {
  getProposal,
  getMemberByUserId,
  getMemberVote,
  isMemberEligible,
  getProposalResult,
  proposalVoteCount,
} from "@/lib/governance"
import { explorerUrl } from "@/lib/xrpl"
import { StatusPill } from "@/components/governance/status-pill"
import { VoteForm } from "@/components/governance/vote-form"

export const dynamic = "force-dynamic"

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

  const showResults = proposal.status === "closed" || proposal.status === "results_published" || proposal.status === "archived"
  const [result, voteCount] = await Promise.all([
    showResults ? getProposalResult(id) : Promise.resolve(null),
    proposalVoteCount(id),
  ])
  const optionTally: Record<string, number> = result?.optionTally ? JSON.parse(result.optionTally) : {}
  const anchorHash = result?.xrplTxHash ?? null

  const canVote = proposal.status === "active" && eligibleVoter && onList && !existing

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/dashboard/governance"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-2 hover:text-heading"
      >
        <ArrowLeft className="size-4" /> Back to governance
      </Link>

      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-2">{proposal.reference}</p>
          <h1 className="text-2xl font-bold text-heading text-balance">{proposal.title}</h1>
        </div>
        <StatusPill status={proposal.status} />
      </div>

      {proposal.description && (
        <div className="mb-6 rounded-2xl border border-line bg-card p-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-2">{proposal.description}</p>
        </div>
      )}

      {existing && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-border bg-mint p-5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green" />
          <div>
            <p className="font-semibold text-heading">Your vote is recorded</p>
            <p className="mt-1 text-sm text-muted-2">
              Receipt code:{" "}
              <Link href={`/governance/verify?code=${existing.receiptCode}`} className="font-mono font-semibold text-green hover:underline">
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
    </div>
  )
}

function Tally({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${highlight ? "border-green-border bg-mint" : "border-line bg-background"}`}>
      <p className="text-2xl font-bold text-heading">{value}</p>
      <p className="mt-0.5 text-xs text-muted-2">{label}</p>
    </div>
  )
}

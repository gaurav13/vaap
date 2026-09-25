import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { xrplAnchors, xrplTransactions } from "@/lib/db/schema"
import { getProposal, getProposalResult, eligibleMemberIds, proposalVoteCount } from "@/lib/governance"
import { explorerUrl } from "@/lib/xrpl"
import { StatusPill } from "@/components/governance/status-pill"
import { ProposalAdminControls } from "@/components/governance/proposal-admin-controls"

export const dynamic = "force-dynamic"

export default async function AdminProposalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) notFound()

  const data = await getProposal(id)
  if (!data) notFound()
  const { proposal, options } = data

  const [result, eligible, voteCount, anchors] = await Promise.all([
    getProposalResult(id),
    eligibleMemberIds(proposal),
    proposalVoteCount(id),
    db
      .select()
      .from(xrplAnchors)
      .where(and(eq(xrplAnchors.anchorType, "proposal_result"), eq(xrplAnchors.refId, id)))
      .orderBy(desc(xrplAnchors.createdAt)),
  ])
  const anchor = anchors[0] ?? null
  const optionTally: Record<string, number> = result?.optionTally ? JSON.parse(result.optionTally) : {}

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/admin/governance"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-2 hover:text-heading"
      >
        <ArrowLeft className="size-4" /> Back to proposals
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-2">{proposal.reference}</p>
          <h1 className="text-2xl font-bold text-heading">{proposal.title}</h1>
        </div>
        <StatusPill status={proposal.status} />
      </div>

      {proposal.summary && <p className="mb-4 text-sm text-muted-2">{proposal.summary}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Eligible voters" value={eligible.length} />
        <Stat label="Votes cast" value={voteCount} />
        <Stat label="Quorum" value={`${proposal.quorum}%`} />
        <Stat label="Pass at" value={`${proposal.passThreshold}%`} />
      </div>

      <ProposalAdminControls id={id} status={proposal.status} />

      {proposal.description && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-2 text-base font-bold text-heading">Resolution text</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-2">{proposal.description}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-heading">Result</h2>
            <StatusPill status={result.outcome} />
          </div>
          {proposal.voteType === "yes_no_abstain" ? (
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Yes" value={result.yesCount} />
              <Stat label="No" value={result.noCount} />
              <Stat label="Abstain" value={result.abstainCount} />
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
          {result.resultHash && (
            <p className="mt-4 break-all rounded-lg bg-background p-3 font-mono text-xs text-muted-2">
              Result hash: {result.resultHash}
            </p>
          )}
        </div>
      )}

      {proposal.anchorResultOnXrpl && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-2 text-base font-bold text-heading">XRP Ledger anchor (testnet)</h2>
          {!anchor ? (
            <p className="text-sm text-muted-2">Close the vote to anchor the result on-chain.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={anchor.status} />
              {anchor.txHash ? (
                <a
                  href={explorerUrl(anchor.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:underline"
                >
                  View transaction <ExternalLink className="size-3.5" />
                </a>
              ) : (
                <span className="text-sm text-muted-2">Awaiting the XRPL worker to submit the transaction.</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="text-xs text-muted-2">{label}</p>
      <p className="mt-1 text-xl font-bold text-heading">{value}</p>
    </div>
  )
}

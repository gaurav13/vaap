import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, Users, Layers, Percent, ShieldCheck, Calendar } from "lucide-react"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { xrplAnchors } from "@/lib/db/schema"
import { getProposal, getProposalResult, eligibleMemberIds, proposalVoteCount } from "@/lib/governance"
import { explorerUrl } from "@/lib/xrpl"
import { StatusPill } from "@/components/governance/status-pill"
import { ProposalAdminControls } from "@/components/governance/proposal-admin-controls"
import { DeleteProposalButton } from "@/components/governance/delete-proposal-button"
import { getSession, isAdmin } from "@/lib/session"
import { ProposalDocumentsManager, type ManagedDocument } from "@/components/governance/proposal-documents-manager"
import { formatFileSize, listProposalDocuments } from "@/lib/proposal-extras"

export const dynamic = "force-dynamic"

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

export default async function AdminProposalDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ docsFailed?: string }>
}) {
  const { id: idStr } = await params
  const docsFailed = Number((await searchParams).docsFailed) || 0
  const id = Number(idStr)
  const session = await getSession()
  const canDelete = isAdmin(session?.user?.role)
  if (!Number.isFinite(id)) notFound()

  const data = await getProposal(id)
  if (!data) notFound()
  const { proposal, options } = data

  const [result, eligible, voteCount, anchors, documents] = await Promise.all([
    getProposalResult(id),
    eligibleMemberIds(proposal),
    proposalVoteCount(id),
    db
      .select()
      .from(xrplAnchors)
      .where(and(eq(xrplAnchors.anchorType, "proposal_result"), eq(xrplAnchors.refId, id)))
      .orderBy(desc(xrplAnchors.createdAt)),
    listProposalDocuments(id),
  ])
  const managedDocuments: ManagedDocument[] = documents.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    fileName: d.fileName,
    fileType: d.fileType,
    sizeLabel: formatFileSize(d.fileSize),
    uploadedByName: d.uploadedByName,
    createdAt: new Date(d.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
  }))
  const anchor = anchors[0] ?? null
  const optionTally: Record<string, number> = result?.optionTally ? JSON.parse(result.optionTally) : {}
  const eligibleCount = eligible.length
  const turnout = eligibleCount > 0 ? Math.round((voteCount / eligibleCount) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/admin/governance"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-2 hover:text-heading"
      >
        <ArrowLeft className="size-4" /> Back to proposals
      </Link>

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-2">{proposal.reference}</p>
          <h1 className="text-2xl font-bold text-heading">{proposal.title}</h1>
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

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Eligible voters" value={eligibleCount} />
        <Stat label="Votes cast" value={voteCount} />
        <Stat label="Turnout" value={`${turnout}%`} />
        <Stat label="Visibility" value={proposal.visibility === "open" ? "Public" : "Members"} />
      </div>

      {/* Participation bar */}
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
          {turnout}% turnout{proposal.quorum > 0 ? ` · quorum ${proposal.quorum}%` : ""}
        </p>
      </div>

      <ProposalAdminControls id={id} status={proposal.status} />

      {canDelete && (
        <div className="mt-6">
          <DeleteProposalButton
            id={id}
            reference={proposal.reference}
            title={proposal.title}
            voteCount={voteCount}
            redirectTo="/admin/governance"
          />
        </div>
      )}

      {docsFailed > 0 && (
        <p role="alert" className="mt-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          The proposal was created, but {docsFailed} document{docsFailed === 1 ? "" : "s"} failed to upload. Please
          upload {docsFailed === 1 ? "it" : "them"} again below.
        </p>
      )}
      <ProposalDocumentsManager proposalId={id} documents={managedDocuments} />

      {/* Resolution text */}
      {proposal.description && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-6">
          <h2 className="mb-2 text-base font-bold text-heading">Resolution text</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-2">{proposal.description}</p>
        </div>
      )}

      {/* Result */}
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

      {/* XRPL anchor */}
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

      {/* Timeline */}
      <div className="mt-6 rounded-2xl border border-line bg-card p-6">
        <h2 className="mb-3 inline-flex items-center gap-2 text-base font-bold text-heading">
          <Calendar className="size-4 text-green" /> Timeline
        </h2>
        <ul className="flex flex-col gap-2 text-sm">
          <TimelineRow label="Created" value={fmtDate(proposal.createdAt)} />
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="text-xs text-muted-2">{label}</p>
      <p className="mt-1 text-xl font-bold text-heading">{value}</p>
    </div>
  )
}

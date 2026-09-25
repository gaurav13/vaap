import Link from "next/link"
import { Download, FileText, ShieldCheck, Vote, Users, LinkIcon } from "lucide-react"
import { getGovernanceSummary } from "@/lib/governance-reports"

export const dynamic = "force-dynamic"

const EXPORTS = [
  {
    kind: "proposals",
    title: "Proposal results",
    description: "Every resolution with tallies, outcome, result hash, and XRPL anchor.",
  },
  {
    kind: "elections",
    title: "Election results",
    description: "Per-candidate vote counts, winners, and result hashes.",
  },
  {
    kind: "audit",
    title: "Audit log",
    description: "Full trail of governance actions with actor, role, and timestamp.",
  },
  {
    kind: "xrpl",
    title: "XRPL ledger record",
    description: "All testnet transactions with hashes, ledger index, and status.",
  },
]

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  sub?: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center gap-2 text-muted-2">
        <Icon className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-heading">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-2">{sub}</p> : null}
    </div>
  )
}

export default async function GovernanceReportsPage() {
  const summary = await getGovernanceSummary()

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Reports &amp; Audit</h1>
        <p className="mt-1 text-sm text-muted-2">
          Governance analytics, CSV exports, and the immutable audit trail.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Vote}
          label="Proposals"
          value={summary.proposals.total}
          sub={`${summary.proposals.open} open · ${summary.proposals.passed} passed`}
        />
        <StatCard
          icon={Users}
          label="Elections"
          value={summary.elections.total}
          sub={`${summary.elections.open} open · ${summary.elections.closed} closed`}
        />
        <StatCard
          icon={FileText}
          label="Votes cast"
          value={summary.votesCast + summary.ballotsCast}
          sub={`${summary.votesCast} proposal · ${summary.ballotsCast} election`}
        />
        <StatCard
          icon={LinkIcon}
          label="XRPL verified"
          value={summary.xrpl.verified}
          sub={`${summary.xrpl.pending} pending · ${summary.xrpl.failed} failed`}
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-2">
          <Download className="size-4" /> Exports
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {EXPORTS.map((e) => (
            <div key={e.kind} className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-card p-5">
              <div>
                <p className="font-semibold text-heading">{e.title}</p>
                <p className="mt-1 text-sm text-muted-2">{e.description}</p>
              </div>
              <a
                href={`/api/governance/export/${e.kind}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-green transition-colors hover:bg-mint"
              >
                <Download className="size-4" /> CSV
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/governance/audit"
          className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
        >
          <ShieldCheck className="size-4" /> View audit log
        </Link>
      </div>
    </div>
  )
}

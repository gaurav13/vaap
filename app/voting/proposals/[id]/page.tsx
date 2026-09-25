import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { getSession } from "@/lib/session"
import { getProposal, getMemberByUserId, getMemberVote, isMemberEligible } from "@/lib/governance"
import { getPublicProposalDetail, getPublicParticipation } from "@/lib/governance-public"
import { hasGovernanceRight } from "@/lib/voting-rights"
import { StatusPill } from "@/components/governance/status-pill"
import { VoteCountdown } from "@/components/governance/vote-countdown"
import { PublicVotePanel, type VoterState } from "@/components/governance/public-vote-panel"

export const dynamic = "force-dynamic"

const EXPLORER = "https://testnet.xrpl.org/transactions/"

function fmtDate(d: Date | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function PublicProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proposalId = Number(id)
  if (!Number.isFinite(proposalId)) notFound()

  const data = await getProposal(proposalId)
  if (!data) notFound()
  const { proposal, options } = data

  // Only publicly listable statuses are viewable on the public site.
  if (!["active", "published", "closed", "results_published", "archived"].includes(proposal.status)) {
    notFound()
  }

  const [user, detail, participation] = await Promise.all([
    getHeaderUser(),
    getPublicProposalDetail(proposal),
    getPublicParticipation(proposal),
  ])

  const isOpen = proposal.status === "active" && (!proposal.closesAt || new Date(proposal.closesAt).getTime() > Date.now())

  // Build the current viewer's voting state.
  const session = await getSession()
  const voter: VoterState = {
    loggedIn: Boolean(session?.user),
    memberNumber: null,
    eligible: false,
    ineligibleReason: null,
    existingChoice: null,
    existingReceipt: null,
    existingVerified: false,
    allowVoteChanges: Boolean(proposal.allowVoteChanges),
  }

  if (session?.user) {
    const member = await getMemberByUserId(session.user.id)
    if (!member) {
      voter.ineligibleReason = "No VAAP member profile is linked to your account."
    } else {
      voter.memberNumber = member.membershipId ?? null
      const [right, onList, existing] = await Promise.all([
        hasGovernanceRight(member.id),
        isMemberEligible(proposal, member.id),
        getMemberVote(proposalId, member.id),
      ])
      const active = member.status === "active"
      voter.eligible = active && right && onList
      if (!active) voter.ineligibleReason = "Your membership is not currently active."
      else if (!right) voter.ineligibleReason = "You have not been granted governance voting rights."
      else if (!onList) voter.ineligibleReason = "You are not on the eligibility list for this proposal."
      if (existing) {
        voter.existingChoice =
          existing.choice === "option"
            ? options.find((o) => o.id === existing.optionId)?.label ?? "Selected option"
            : existing.choice
        voter.existingReceipt = existing.receiptCode
        voter.existingVerified = existing.xrplStatus === "verified"
      }
    }
  }

  const loginHref = `/sign-in?returnTo=${encodeURIComponent(`/voting/proposals/${proposalId}`)}`

  const sections: { title: string; body: string }[] = [
    { title: "Background", body: proposal.background },
    { title: "Objectives", body: proposal.objectives },
    { title: "Expected impact", body: proposal.expectedImpact },
    { title: "Implementation plan", body: proposal.implementationPlan },
    { title: "Timeline", body: proposal.timelineText },
    { title: "Budget & resources", body: proposal.budget },
  ].filter((s) => s.body && s.body.trim().length > 0)

  return (
    <>
      <SiteHeaderServer active="Voting" user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-5 flex items-center gap-1.5 text-sm text-muted-2">
          <Link href="/voting" className="hover:text-green">
            Voting
          </Link>
          <span>/</span>
          <Link href="/voting/proposals" className="hover:text-green">
            Proposals
          </Link>
          <span>/</span>
          <span className="text-heading">{proposal.reference ?? `#${proposal.id}`}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Main column */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-green">
                {proposal.category}
              </span>
              <StatusPill status={proposal.status} />
              {proposal.committee && (
                <span className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted-2">
                  {proposal.committee}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-balance text-3xl font-bold leading-tight text-heading sm:text-4xl">
              {proposal.title}
            </h1>
            {proposal.reference && <p className="mt-2 font-mono text-sm text-muted-2">{proposal.reference}</p>}

            {proposal.summary && (
              <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-2">{proposal.summary}</p>
            )}

            {proposal.description && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-heading">Description</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-muted-2">{proposal.description}</p>
              </div>
            )}

            {sections.map((s) => (
              <div key={s.title} className="mt-6">
                <h2 className="text-lg font-bold text-heading">{s.title}</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-muted-2">{s.body}</p>
              </div>
            ))}

            {/* Meta */}
            <dl className="mt-8 grid gap-4 rounded-2xl border border-line bg-card p-5 sm:grid-cols-2">
              <Meta label="Vote type" value={proposal.voteType.replace(/_/g, " ")} />
              <Meta label="Pass threshold" value={`${proposal.passThreshold}%`} />
              <Meta label="Quorum" value={proposal.quorum ? `${proposal.quorum} votes` : "None"} />
              <Meta label="Opens" value={fmtDate(proposal.opensAt)} />
              <Meta label="Closes" value={fmtDate(proposal.closesAt)} />
              {proposal.proposalOwner && <Meta label="Proposal owner" value={proposal.proposalOwner} />}
            </dl>

            {/* Results */}
            <div id="results" className="mt-8 scroll-mt-24">
              {detail.showResults && detail.result ? (
                <ResultsBlock
                  voteType={proposal.voteType}
                  result={detail.result}
                  options={options}
                  optionTally={detail.optionTally}
                  eligibleCount={detail.eligibleCount}
                  live={detail.showLiveResults && isOpen}
                  anchorHash={detail.anchorHash}
                />
              ) : (
                <div className="rounded-2xl border border-line bg-card p-6 text-center">
                  <h2 className="text-lg font-bold text-heading">Results</h2>
                  <p className="mt-2 text-sm text-muted-2">
                    Results will be published once voting closes and the count is verified and anchored to the XRP
                    Ledger.
                  </p>
                </div>
              )}
            </div>

            {/* Participation */}
            {participation.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold text-heading">
                  Member participation <span className="text-muted-2">({participation.length})</span>
                </h2>
                <p className="mt-1 text-sm text-muted-2">
                  A public record of who took part. Individual selections are hidden unless the proposal is configured
                  for public individual votes.
                </p>
                <div className="mt-3 overflow-hidden rounded-2xl border border-line">
                  <table className="w-full text-sm">
                    <thead className="bg-card text-left text-xs uppercase tracking-wide text-muted-2">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Member</th>
                        {participation.some((p) => p.choice) && <th className="px-4 py-2.5 font-semibold">Vote</th>}
                        <th className="px-4 py-2.5 font-semibold">Recorded</th>
                        <th className="px-4 py-2.5 font-semibold">Blockchain</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {participation.slice(0, 100).map((p, i) => (
                        <tr key={i} className="bg-background">
                          <td className="px-4 py-2.5 font-mono text-xs text-heading">{p.identifier}</td>
                          {participation.some((x) => x.choice) && (
                            <td className="px-4 py-2.5 font-semibold uppercase text-heading">{p.choice ?? "—"}</td>
                          )}
                          <td className="px-4 py-2.5 text-muted-2">{fmtDate(p.castAt)}</td>
                          <td className="px-4 py-2.5">
                            {p.xrplVerified ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green">
                                <ShieldCheck className="size-3.5" /> Verified
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sticky voting panel */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-4">
              {isOpen && proposal.closesAt && (
                <div className="rounded-2xl border border-line bg-card p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Voting closes in</p>
                  <VoteCountdown closesAt={new Date(proposal.closesAt).toISOString()} />
                </div>
              )}

              <div className="rounded-2xl border border-line bg-card p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-2">Votes cast</span>
                  <span className="font-semibold text-heading">
                    {detail.voteCount} / {detail.eligibleCount}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-green" style={{ width: `${Math.min(detail.turnout, 100)}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-2">{detail.turnout.toFixed(1)}% turnout</p>
              </div>

              <PublicVotePanel
                proposalId={proposal.id}
                proposalRef={proposal.reference ?? `#${proposal.id}`}
                proposalTitle={proposal.title}
                voteType={proposal.voteType}
                options={options.map((o) => ({ id: o.id, label: o.label }))}
                isOpen={isOpen}
                closesAtLabel={fmtDate(proposal.closesAt)}
                loginHref={loginHref}
                voter={voter}
              />
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium capitalize text-heading">{value}</dd>
    </div>
  )
}

function ResultsBlock({
  voteType,
  result,
  options,
  optionTally,
  eligibleCount,
  live,
  anchorHash,
}: {
  voteType: string
  result: NonNullable<Awaited<ReturnType<typeof getPublicProposalDetail>>["result"]>
  options: { id: number; label: string }[]
  optionTally: Record<string, number>
  eligibleCount: number
  live: boolean
  anchorHash: string | null
}) {
  const yesNo = voteType === "yes_no_abstain"
  const total = result.totalVotes || 0

  const rows = yesNo
    ? [
        { label: "Yes", value: result.yesCount, color: "bg-green" },
        { label: "No", value: result.noCount, color: "bg-destructive" },
        { label: "Abstain", value: result.abstainCount, color: "bg-muted-foreground" },
      ]
    : options.map((o) => ({ label: o.label, value: optionTally[String(o.id)] ?? 0, color: "bg-green" }))

  const passed = result.outcome === "passed"
  const failed = result.outcome === "failed"

  return (
    <div className="rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-heading">{live ? "Live results" : "Final results"}</h2>
        {!live && passed && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-sm font-semibold text-green">
            <CheckCircle2 className="size-4" /> Passed
          </span>
        )}
        {!live && failed && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">
            <XCircle className="size-4" /> Did not pass
          </span>
        )}
        {live && (
          <span className="rounded-full border border-green-border bg-mint px-3 py-1 text-xs font-semibold text-green">
            Updating live
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {rows.map((r) => {
          const pct = total > 0 ? (r.value / total) * 100 : 0
          return (
            <div key={r.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-heading">{r.label}</span>
                <span className="text-muted-2">
                  {r.value} {total > 0 && `· ${pct.toFixed(1)}%`}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-line">
                <div className={`h-full rounded-full ${r.color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-4 border-t border-line pt-4 text-sm text-muted-2">
        <span>
          Total votes: <span className="font-semibold text-heading">{total}</span>
        </span>
        {eligibleCount > 0 && (
          <span>
            Eligible: <span className="font-semibold text-heading">{eligibleCount}</span>
          </span>
        )}
      </div>

      {anchorHash && (
        <a
          href={`${EXPLORER}${anchorHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-green-border bg-mint px-4 py-2.5 text-sm font-semibold text-green hover:bg-mint-2"
        >
          <ShieldCheck className="size-4" /> XRPL Verified — view on ledger
        </a>
      )}
    </div>
  )
}

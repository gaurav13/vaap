import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Hash,
  Info,
  PieChart,
  ShieldCheck,
  User,
  Users,
  Vote,
  XCircle,
} from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { getSession, isStaff } from "@/lib/session"
import { listProposalComments, listProposalDocuments } from "@/lib/proposal-extras"
import { ProposalDocumentsList } from "@/components/governance/proposal-documents-list"
import { ProposalDiscussion, type DiscussionComment } from "@/components/governance/proposal-discussion"
import { getProposal, getMemberByUserId, getMemberVote, isMemberEligible } from "@/lib/governance"
import { getPublicProposalDetail, getPublicParticipation } from "@/lib/governance-public"
import { hasGovernanceRight } from "@/lib/voting-rights"
import { isHtml, sanitizeRichText } from "@/lib/sanitize"
import { StatusPill } from "@/components/governance/status-pill"
import { VoteCountdown } from "@/components/governance/vote-countdown"
import { ProposalTabs } from "@/components/governance/proposal-tabs"
import { PublicVotePanel, type VoterState } from "@/components/governance/public-vote-panel"

export const dynamic = "force-dynamic"

const EXPLORER = "https://testnet.xrpl.org/transactions/"
const FALLBACK_BANNER = "/images/support-faisal-mosque.png"

const VOTE_TYPE_LABEL: Record<string, string> = {
  yes_no_abstain: "Yes / No / Abstain",
  single_choice: "Single choice",
  multi_choice: "Multiple choice",
}

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

  if (!["active", "published", "closed", "results_published", "archived"].includes(proposal.status)) {
    notFound()
  }

  const [user, detail, participation, session, docs, comments] = await Promise.all([
    getHeaderUser(),
    getPublicProposalDetail(proposal),
    getPublicParticipation(proposal),
    getSession(),
    listProposalDocuments(proposalId),
    listProposalComments(proposalId),
  ])
  let memberStatus: string | null = null

  const isOpen = proposal.status === "active" && (!proposal.closesAt || new Date(proposal.closesAt).getTime() > Date.now())

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
      memberStatus = member.status
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

  const staffViewer = isStaff(session?.user?.role)
  const discussionOpen = proposal.status !== "archived"
  const canComment = Boolean(session?.user) && discussionOpen && (staffViewer || memberStatus === "active")
  const commentBlockedReason = !session?.user
    ? "Sign in as a VAAP member to join the discussion."
    : !discussionOpen
      ? "Discussion is closed for this archived proposal."
      : "Only active VAAP members can take part in the discussion."
  const discussionComments: DiscussionComment[] = comments.map((c) => ({
    id: c.id,
    authorName: c.authorName || "Member",
    authorRole: c.authorRole,
    body: c.body,
    createdAt: fmtDate(c.createdAt),
    canDelete: Boolean(session?.user) && (staffViewer || c.userId === session?.user?.id),
  }))

  const ref = proposal.reference ?? `#${proposal.id}`
  const loginHref = `/sign-in?returnTo=${encodeURIComponent(`/voting/proposals/${proposalId}`)}`
  const voteTypeLabel = VOTE_TYPE_LABEL[proposal.voteType] ?? proposal.voteType.replace(/_/g, " ")
  const quorumLabel = proposal.quorum ? `${proposal.quorum} votes` : "None"
  const bannerSrc = proposal.bannerImageUrl || FALLBACK_BANNER
  const bannerAlt = proposal.bannerAlt || (proposal.bannerImageUrl ? proposal.title : "Faisal Mosque, Islamabad")

  const sections = [
    { title: "Background", body: proposal.background },
    { title: "Objectives", body: proposal.objectives },
    { title: "Expected impact", body: proposal.expectedImpact },
    { title: "Implementation plan", body: proposal.implementationPlan },
    { title: "Timeline", body: proposal.timelineText },
    { title: "Budget & resources", body: proposal.budget },
  ].filter((s) => s.body && s.body.trim().length > 0)

  const overview = (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="flex items-center gap-3 text-xl font-bold text-heading">
          <FileText className="size-6 text-green" aria-hidden="true" /> Proposal Details
        </h2>
        <div className="mt-3">
          <RichText value={proposal.description || proposal.summary || "No additional details were provided."} />
        </div>
      </section>

      {!detail.showResults && (
        <div className="flex items-start gap-3 rounded-xl border border-gold/40 bg-gold-tint p-4 text-sm leading-relaxed text-heading">
          <Info className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
          <p>
            Results will be published once voting closes and the count is verified and anchored to the XRP Ledger to
            ensure transparency and immutability.
          </p>
        </div>
      )}

      {sections.map((s) => (
        <section key={s.title}>
          <h3 className="text-lg font-bold text-heading">{s.title}</h3>
          <div className="mt-2">
            <RichText value={s.body} />
          </div>
        </section>
      ))}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-background p-5">
          <h3 className="flex items-center gap-2 font-bold text-heading">
            <FileText className="size-5 text-green" aria-hidden="true" /> Key Information
          </h3>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <InfoRow icon={<Hash className="size-4" />} label="Proposal ID" value={ref} />
            <InfoRow icon={<Vote className="size-4" />} label="Vote Type" value={voteTypeLabel} />
            <InfoRow icon={<PieChart className="size-4" />} label="Pass Threshold" value={`${proposal.passThreshold}%`} />
            <InfoRow icon={<Users className="size-4" />} label="Quorum" value={quorumLabel} />
            {proposal.committee && <InfoRow icon={<Users className="size-4" />} label="Committee" value={proposal.committee} />}
            {proposal.proposalOwner && (
              <InfoRow icon={<User className="size-4" />} label="Owner" value={proposal.proposalOwner} />
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-line bg-background p-5">
          <h3 className="flex items-center gap-2 font-bold text-heading">
            <CalendarDays className="size-5 text-green" aria-hidden="true" /> Important Dates
          </h3>
          <ol className="relative mt-4 flex flex-col gap-5 border-l border-dashed border-line pl-5">
            <TimelineItem tone="green" label="Voting Opens" value={fmtDate(proposal.opensAt)} />
            <TimelineItem tone="red" label="Voting Closes" value={fmtDate(proposal.closesAt)} />
          </ol>
        </div>
      </div>
    </div>
  )

  const documents = (
    <ProposalDocumentsList documents={docs} loggedIn={voter.loggedIn} loginHref={loginHref} />
  )

  const discussion = (
    <ProposalDiscussion
      proposalId={proposalId}
      comments={discussionComments}
      canPost={canComment}
      blockedReason={commentBlockedReason}
      loginHref={voter.loggedIn ? null : loginHref}
    />
  )

  const results = (
    <div className="flex flex-col gap-6">
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
        <EmptyState
          icon={<PieChart className="size-6" />}
          title="Results not yet published"
          body="Results will be published once voting closes and the count is verified and anchored to the XRP Ledger."
        />
      )}

      {participation.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-heading">
            Member participation <span className="text-muted-2">({participation.length})</span>
          </h3>
          <p className="mt-1 text-sm text-muted-2">
            A public record of who took part. Individual selections are hidden unless the proposal is configured for
            public individual votes.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
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
                        <span className="text-xs text-muted-2">Pending</span>
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
  )

  return (
    <>
      <SiteHeaderServer active="Voting" user={user} />
      <main className="bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link
              href="/voting/proposals"
              className="inline-flex items-center gap-2 font-medium text-heading transition-colors hover:text-green"
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Back to Proposals
            </Link>
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-muted-2">
                <li>
                  <Link href="/" className="hover:text-green">
                    Home
                  </Link>
                </li>
                <ChevronRight className="size-3.5" aria-hidden="true" />
                <li>
                  <Link href="/voting" className="hover:text-green">
                    Voting
                  </Link>
                </li>
                <ChevronRight className="size-3.5" aria-hidden="true" />
                <li>
                  <Link href="/voting/proposals" className="hover:text-green">
                    Proposals
                  </Link>
                </li>
                <ChevronRight className="size-3.5" aria-hidden="true" />
                <li aria-current="page" className="font-medium text-heading">
                  {ref}
                </li>
              </ol>
            </nav>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-6">
              {/* Hero */}
              <section className="relative overflow-hidden rounded-2xl border border-line bg-background shadow-sm">
                <div className="absolute inset-y-0 right-0 hidden w-[55%] md:block" aria-hidden={!proposal.bannerImageUrl}>
                  <Image
                    src={bannerSrc || "/placeholder.svg"}
                    alt={bannerAlt}
                    fill
                    priority
                    sizes="(min-width: 1024px) 480px, 50vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-background via-background/30 via-35% to-transparent" />
                </div>

                <div className="relative p-6 sm:p-8 md:max-w-[70%]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-green px-3.5 py-1 text-xs font-semibold text-primary-foreground">
                      {proposal.category}
                    </span>
                    <StatusPill status={proposal.status} />
                  </div>

                  <h1 className="mt-4 text-balance text-3xl font-bold leading-tight text-heading sm:text-4xl">
                    {proposal.title}
                  </h1>
                  <p className="mt-1 text-sm tracking-wide text-muted-2">{ref}</p>

                  {proposal.summary && (
                    <p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted-2">{proposal.summary}</p>
                  )}

                  <dl className="mt-6 flex flex-col">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5 pb-5 sm:grid-cols-3">
                      <HeroMeta icon={<User className="size-6" />} label="Vote Type" value={voteTypeLabel} />
                      <HeroMeta icon={<PieChart className="size-6" />} label="Pass Threshold" value={`${proposal.passThreshold}%`} />
                      <HeroMeta icon={<Users className="size-6" />} label="Quorum" value={quorumLabel} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-5 sm:grid-cols-3">
                      <HeroMeta icon={<CalendarDays className="size-6" />} label="Opens" value={fmtDate(proposal.opensAt)} />
                      <HeroMeta icon={<CalendarClock className="size-6" />} label="Closes" value={fmtDate(proposal.closesAt)} />
                    </div>
                  </dl>
                </div>
              </section>

              <ProposalTabs
                initial={isOpen ? "overview" : "results"}
                tabs={[
                  { id: "overview", label: "Overview", content: overview },
                  { id: "documents", label: `Documents (${docs.length})`, content: documents },
                  { id: "discussion", label: `Discussion (${comments.length})`, content: discussion },
                  { id: "results", label: "Results", content: results },
                ]}
              />
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="flex flex-col gap-4">
                {isOpen && proposal.closesAt && (
                  <div className="rounded-2xl bg-gradient-to-br from-green to-green-hover p-5 shadow-md">
                    <p className="mb-4 flex items-center gap-2.5 font-semibold text-primary-foreground">
                      <Clock className="size-5" aria-hidden="true" /> Voting Closes In
                    </p>
                    <VoteCountdown closesAt={new Date(proposal.closesAt).toISOString()} tone="dark" />
                  </div>
                )}

                <div className="rounded-2xl border border-line bg-background p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-heading">Votes Cast</span>
                    <span className="font-bold text-heading">
                      {detail.voteCount} / {detail.eligibleCount}
                    </span>
                  </div>
                  <div
                    className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-line"
                    role="progressbar"
                    aria-valuenow={Math.round(detail.turnout)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Turnout"
                  >
                    <div
                      className="h-full min-w-2.5 rounded-full bg-green"
                      style={{ width: `${Math.min(detail.turnout, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-2">{detail.turnout.toFixed(1)}% turnout</p>
                </div>

                <PublicVotePanel
                  proposalId={proposal.id}
                  proposalRef={ref}
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
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

function RichText({ value }: { value: string }) {
  if (isHtml(value)) {
    return (
      <div
        className="leading-relaxed text-muted-2 [&_a]:text-green [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-green-border [&_blockquote]:pl-4 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-heading [&_h3]:mt-3 [&_h3]:font-bold [&_h3]:text-heading [&_img]:my-3 [&_img]:rounded-xl [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-2 [&_strong]:text-heading [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
      />
    )
  }
  return <p className="whitespace-pre-line leading-relaxed text-muted-2">{value}</p>
}

function HeroMeta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-2" aria-hidden="true">
        {icon}
      </span>
      <div>
        <dt className="text-sm text-muted-2">{label}</dt>
        <dd className="mt-0.5 font-semibold text-heading">{value}</dd>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1.25rem_7.5rem_1fr] items-center gap-2">
      <span className="text-muted-2" aria-hidden="true">
        {icon}
      </span>
      <dt className="text-muted-2">{label}</dt>
      <dd className="font-medium text-heading">{value}</dd>
    </div>
  )
}

function TimelineItem({ tone, label, value }: { tone: "green" | "red"; label: string; value: string }) {
  return (
    <li className="relative">
      <span
        className={`absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full ${tone === "green" ? "bg-green" : "bg-destructive"}`}
        aria-hidden="true"
      />
      <p className="text-sm text-muted-2">{label}</p>
      <p className="font-semibold text-heading">{value}</p>
    </li>
  )
}

function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-mint text-green" aria-hidden="true">
        {icon}
      </span>
      <p className="font-semibold text-heading">{title}</p>
      <p className="max-w-sm text-sm text-muted-2">{body}</p>
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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-heading">{live ? "Live results" : "Final results"}</h2>
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

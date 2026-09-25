import Link from "next/link"
import { redirect } from "next/navigation"
import { Vote, ArrowRight, ShieldCheck } from "lucide-react"
import { getSession } from "@/lib/session"
import { listProposals, getMemberByUserId, getMemberVote } from "@/lib/governance"
import { getVotingRights } from "@/lib/voting-rights"
import { PageHeading } from "@/components/member/page-heading"
import { StatusPill } from "@/components/governance/status-pill"

export const dynamic = "force-dynamic"

export default async function MemberGovernancePage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const member = await getMemberByUserId(session.user.id)
  const rights = member ? await getVotingRights(member.id) : null
  const eligible = rights?.governanceStatus === "approved" && member?.status === "active"

  const proposals = await listProposals({ statuses: ["active", "closed", "results_published", "archived"] })
  const votedMap = new Map<number, boolean>()
  if (member) {
    await Promise.all(
      proposals.map(async (p) => {
        const v = await getMemberVote(p.id, member.id)
        votedMap.set(p.id, Boolean(v))
      }),
    )
  }

  const active = proposals.filter((p) => p.status === "active")
  const past = proposals.filter((p) => p.status !== "active")

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeading title="Governance & Voting" description="Cast your vote on VAAP resolutions and review past outcomes." />

      {!eligible && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-card p-5">
          <ShieldCheck className="size-5 shrink-0 text-muted-2" />
          <p className="text-sm text-muted-2">
            {rights?.governanceStatus === "pending"
              ? "Your governance voting right is pending review by VAAP administration. You can view proposals in the meantime."
              : rights?.governanceStatus === "suspended"
                ? "Your governance voting right is currently suspended. Contact VAAP administration for details."
                : rights?.governanceStatus === "revoked" || rights?.governanceStatus === "rejected"
                  ? "You do not have governance voting rights. Contact VAAP administration if you believe this is an error."
                  : "You can view proposals, but you are not currently an approved governance voter."}{" "}
            <Link href="/dashboard/voting" className="font-semibold text-green hover:underline">
              Check your voting status
            </Link>
            .
          </p>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-2">Open votes</h2>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card py-10 text-center text-sm text-muted-2">
            No open votes right now. Check back soon.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/governance/${p.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-green-border bg-mint p-5 transition-colors hover:bg-mint/70"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-green text-white">
                        <Vote className="size-4" />
                      </span>
                      <p className="font-semibold text-heading">{p.title}</p>
                    </div>
                    {p.summary && <p className="mt-1.5 text-sm text-muted-2">{p.summary}</p>}
                    <p className="mt-2 text-xs font-medium text-green">
                      {votedMap.get(p.id) ? "You have voted — view details & receipt" : "View details & vote"}
                    </p>
                  </div>
                  <ArrowRight className="size-5 shrink-0 text-green" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-2">Past votes</h2>
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {past.map((p) => (
              <li key={p.id}>
                <Link href={`/dashboard/governance/${p.id}`} className="flex items-center justify-between gap-4 p-5 hover:bg-background">
                  <div>
                    <p className="font-medium text-heading">{p.title}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-2">{p.reference}</p>
                  </div>
                  <StatusPill status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

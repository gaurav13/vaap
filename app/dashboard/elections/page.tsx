import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, Vote } from "lucide-react"
import { getSession } from "@/lib/session"
import { listElections, isVoterEligible, getMemberBallot } from "@/lib/elections"
import { getMemberByUserId } from "@/lib/governance"
import { StatusPill } from "@/components/governance/status-pill"

export const dynamic = "force-dynamic"

export default async function MemberElectionsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const member = await getMemberByUserId(session.user.id)
  const elections = await listElections({
    statuses: ["active", "closed", "results_published"],
  })

  const rows = await Promise.all(
    elections.map(async (e) => {
      const eligible = member ? await isVoterEligible(e.id, member.id) : false
      const ballot = member ? await getMemberBallot(e.id, member.id) : null
      return { election: e, eligible, hasVoted: !!ballot }
    }),
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Vote className="size-5" />
        </span>
        <div>
          <h1 className="font-serif text-2xl text-heading">Elections</h1>
          <p className="text-sm text-muted-foreground">Vote for VAAP office bearers by secret ballot.</p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {rows.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            There are no elections open right now.
          </div>
        )}
        {rows.map(({ election, eligible, hasVoted }) => (
          <Link
            key={election.id}
            href={`/dashboard/elections/${election.id}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 transition hover:border-primary/40"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-heading">{election.title}</h2>
                <StatusPill status={election.status} />
                {hasVoted && election.status === "active" && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Voted
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {election.reference}
                {election.status === "active" && !eligible && " · Not eligible"}
                {election.closesAt && ` · Closes ${new Date(election.closesAt).toLocaleDateString()}`}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}

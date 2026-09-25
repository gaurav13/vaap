import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { listMemberVotingRights } from "@/lib/voting-rights"
import { VotingRightsManager } from "@/components/governance/voting-rights-manager"

export const metadata = {
  title: "Voting Rights | VAAP Admin",
}

export default async function VotingRightsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  // Super-admin only surface.
  if (session.user.role !== "admin") redirect("/admin")

  const rows = await listMemberVotingRights()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Member Voting Approvals</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Review and approve which members can vote. Election voting and governance &amp; proposal voting are approved
          separately &mdash; accepting one does not accept the other. Accept or reject members one at a time, or select
          several and use bulk accept / bulk reject.
        </p>
      </header>
      <VotingRightsManager rows={rows} />
    </div>
  )
}

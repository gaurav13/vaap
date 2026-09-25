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
        <h1 className="text-2xl font-bold text-navy">Voting Rights</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Grant, suspend, or revoke each member&apos;s right to vote. Election rights and governance rights are managed
          separately &mdash; approving one does not approve the other. Only members with an approved right can be
          enrolled or cast a ballot.
        </p>
      </header>
      <VotingRightsManager rows={rows} />
    </div>
  )
}

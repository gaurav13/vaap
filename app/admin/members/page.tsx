import Link from "next/link"
import { db } from "@/lib/db"
import { members, membershipApplications } from "@/lib/db/schema"
import { desc, eq, isNull, isNotNull } from "drizzle-orm"
import { serializeRows } from "@/lib/cms/serialize"
import { MembersAdmin } from "@/components/admin/members-admin"
import { getSession } from "@/lib/session"
import { listMemberVotingRights } from "@/lib/voting-rights"
import { VotingRightsManager } from "@/components/governance/voting-rights-manager"

export default async function AdminMembersPage() {
  const session = await getSession()
  const isSuperAdmin = session?.user?.role === "admin"

  const [rows, trashed, pending, votingRows] = await Promise.all([
    db.select().from(members).where(isNull(members.deletedAt)).orderBy(desc(members.joinedAt)),
    db.select().from(members).where(isNotNull(members.deletedAt)).orderBy(desc(members.deletedAt)),
    db.select({ id: membershipApplications.id }).from(membershipApplications).where(eq(membershipApplications.status, "pending")),
    isSuperAdmin ? listMemberVotingRights() : Promise.resolve(null),
  ])

  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const stats = {
    total: rows.length,
    pending: pending.length,
    active: rows.filter((r) => r.status === "active").length,
    expiringSoon: rows.filter((r) => r.expiresAt && r.expiresAt > now && r.expiresAt <= in30).length,
    newThisMonth: rows.filter((r) => r.joinedAt >= monthStart).length,
  }

  return (
    <>
      {votingRows && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 lg:px-8">
          <Link
            href="#voting-approvals"
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <span>
              <span className="font-semibold text-navy">Member voting approvals</span>
              <span className="text-muted-foreground">
                {" "}
                &mdash; approve election voting and governance &amp; proposal voting, one member or in bulk.
              </span>
            </span>
            <span className="shrink-0 font-medium text-primary">Jump to approvals</span>
          </Link>
        </div>
      )}

      <MembersAdmin
        items={serializeRows(rows) as unknown as Parameters<typeof MembersAdmin>[0]["items"]}
        trashed={serializeRows(trashed) as unknown as Parameters<typeof MembersAdmin>[0]["items"]}
        stats={stats}
      />

      {votingRows && (
        <section
          id="voting-approvals"
          aria-labelledby="voting-approvals-heading"
          className="mx-auto w-full max-w-6xl scroll-mt-6 px-4 py-10 lg:px-8"
        >
          <header className="mb-6 flex flex-col gap-1">
            <h2 id="voting-approvals-heading" className="text-2xl font-bold text-navy">
              Member Voting Approvals
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Election voting and governance &amp; proposal voting are approved separately. Accept or reject a single
              member from their row, or tick several members and use bulk accept / bulk reject.
            </p>
          </header>
          <VotingRightsManager rows={votingRows} />
        </section>
      )}
    </>
  )
}

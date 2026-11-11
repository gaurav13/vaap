import Link from "next/link"
import { db } from "@/lib/db"
import { members, membershipCertificates } from "@/lib/db/schema"
import { desc, isNull, isNotNull } from "drizzle-orm"
import { getMemberDirectory } from "@/lib/membership-funnel"
import { serializeRows } from "@/lib/cms/serialize"
import { MembersAdmin } from "@/components/admin/members-admin"
import { getSession } from "@/lib/session"
import { listMemberVotingRights } from "@/lib/voting-rights"
import { VotingRightsManager } from "@/components/governance/voting-rights-manager"

const STAGES = ["all", "incomplete", "not-paid", "pending-approval", "active", "expired", "suspended"] as const

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const [session, { stage }] = await Promise.all([getSession(), searchParams])
  const isSuperAdmin = session?.user?.role === "admin"
  const initialStage = STAGES.find((s) => s === stage) ?? "all"

  const [memberRows, trashed, directory, votingRows, certRows] = await Promise.all([
    db.select().from(members).where(isNull(members.deletedAt)).orderBy(desc(members.joinedAt)),
    db.select().from(members).where(isNotNull(members.deletedAt)).orderBy(desc(members.deletedAt)),
    getMemberDirectory(),
    isSuperAdmin ? listMemberVotingRights() : Promise.resolve(null),
    db
      .select({
        memberId: membershipCertificates.memberId,
        status: membershipCertificates.status,
        issuedAt: membershipCertificates.issuedAt,
      })
      .from(membershipCertificates)
      .orderBy(desc(membershipCertificates.issuedAt)),
  ])

  // Latest certificate per member: "issued" if one is live, else "revoked" if
  // they only have revoked ones, else none yet.
  const certByMember = new Map<number, { status: string; issuedAt: string }>()
  for (const c of certRows) {
    const prev = certByMember.get(c.memberId)
    if (!prev || (prev.status !== "issued" && c.status === "issued")) {
      certByMember.set(c.memberId, { status: c.status, issuedAt: c.issuedAt.toISOString() })
    }
  }
  // Staff get a redacted, read-only view: no contact or identity details leave the server.
  const redact = <T extends (typeof memberRows)[number]>(r: T): T =>
    isSuperAdmin
      ? r
      : { ...r, email: "Hidden", phone: null, ntn: null, linkedin: null, website: null, userId: null }
  const rows = memberRows.map((r) => ({ ...redact(r), certificate: certByMember.get(r.id) ?? null }))
  const trashedRows = isSuperAdmin ? trashed : []
  const people = directory.rows.map(({ userId: _userId, ...p }) => (isSuperAdmin ? p : { ...p, email: "Hidden" }))

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
        trashed={serializeRows(trashedRows) as unknown as Parameters<typeof MembersAdmin>[0]["items"]}
        people={serializeRows(people) as unknown as Parameters<typeof MembersAdmin>[0]["people"]}
        stats={directory.stats}
        initialStage={initialStage}
        readOnly={!isSuperAdmin}
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

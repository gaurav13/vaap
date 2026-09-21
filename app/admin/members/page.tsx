import { db } from "@/lib/db"
import { members, membershipApplications } from "@/lib/db/schema"
import { desc, eq, isNull, isNotNull } from "drizzle-orm"
import { serializeRows } from "@/lib/cms/serialize"
import { MembersAdmin } from "@/components/admin/members-admin"

export default async function AdminMembersPage() {
  const [rows, trashed, pending] = await Promise.all([
    db.select().from(members).where(isNull(members.deletedAt)).orderBy(desc(members.joinedAt)),
    db.select().from(members).where(isNotNull(members.deletedAt)).orderBy(desc(members.deletedAt)),
    db.select({ id: membershipApplications.id }).from(membershipApplications).where(eq(membershipApplications.status, "pending")),
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
    <MembersAdmin
      items={serializeRows(rows) as unknown as Parameters<typeof MembersAdmin>[0]["items"]}
      trashed={serializeRows(trashed) as unknown as Parameters<typeof MembersAdmin>[0]["items"]}
      stats={stats}
    />
  )
}

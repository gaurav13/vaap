"use server"

import { revalidatePath } from "next/cache"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { auditLogs, complaints } from "@/lib/db/schema"
import { getSession } from "@/lib/session"

const STATUSES = ["submitted", "review", "guidance", "closed"] as const
type ReportStatus = (typeof STATUSES)[number]

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin") throw new Error("Forbidden")
  return session.user
}

export async function getReports() {
  await requireAdmin()
  return db.select().from(complaints).orderBy(desc(complaints.createdAt)).limit(500)
}

export async function updateReport(input: {
  id: number
  status: string
  statusNote: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const me = await requireAdmin()
    const id = Number(input.id)
    if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Invalid report." }
    if (!STATUSES.includes(input.status as ReportStatus)) return { ok: false, error: "Invalid status." }
    const statusNote = String(input.statusNote ?? "").trim().slice(0, 2000) || null

    const [row] = await db
      .update(complaints)
      .set({ status: input.status, statusNote, updatedAt: new Date() })
      .where(eq(complaints.id, id))
      .returning({ reference: complaints.reference })
    if (!row) return { ok: false, error: "Report not found." }

    await db
      .insert(auditLogs)
      .values({
        actorId: me.id,
        actorName: me.name ?? "",
        action: "report.update",
        target: `${row.reference ?? id} → ${input.status}`,
      })
      .catch(() => {})

    revalidatePath("/admin/reports")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update report." }
  }
}

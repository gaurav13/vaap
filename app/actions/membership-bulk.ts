"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { membershipApplications } from "@/lib/db/schema"
import { isPaymentConfirmed, logActivity, requireManager, requireOperator, requireSuperAdmin } from "@/lib/rbac"
import { notify } from "@/lib/notifications"
import { setApplicationStatus } from "@/app/actions/admin"

export type BulkResult = { ok: true; operationId: string; done: number; skipped: { id: number; reason: string }[] } | { ok: false; error: string }

const MAX_BULK = 200

function cleanIds(ids: unknown): number[] | null {
  if (!Array.isArray(ids)) return null
  const out = [...new Set(ids.filter((i): i is number => Number.isInteger(i) && i > 0))]
  return out.length > 0 && out.length <= MAX_BULK ? out : null
}

async function loadLive(ids: number[]) {
  return db
    .select()
    .from(membershipApplications)
    .where(and(inArray(membershipApplications.id, ids), isNull(membershipApplications.deletedAt)))
}

function refresh() {
  revalidatePath("/admin/applications")
  revalidatePath("/admin/membership-overview")
  revalidatePath("/admin")
}

/** Approves each eligible application through the normal single-approval path (payment check, member record, email). */
export async function bulkApproveApplications(rawIds: number[]): Promise<BulkResult> {
  const actor = await requireOperator()
  const ids = cleanIds(rawIds)
  if (!ids) return { ok: false, error: `Select between 1 and ${MAX_BULK} applications.` }
  const operationId = randomUUID()
  const rows = await loadLive(ids)
  const skipped: { id: number; reason: string }[] = ids.filter((id) => !rows.some((r) => r.id === id)).map((id) => ({ id, reason: "Not found" }))
  let done = 0
  for (const row of rows) {
    if (!row.completed) { skipped.push({ id: row.id, reason: "Not submitted" }); continue }
    if (row.status === "approved") { skipped.push({ id: row.id, reason: "Already approved" }); continue }
    const res = await setApplicationStatus(row.id, "approved")
    if (res.ok) done++
    else skipped.push({ id: row.id, reason: res.error })
  }
  await logActivity(actor, "application.bulk_approve", {
    entityType: "application",
    entityId: operationId,
    target: `${done} approved, ${skipped.length} skipped`,
    details: `ids: ${ids.join(",")}${skipped.length ? `; skipped: ${skipped.map((s) => `${s.id} (${s.reason})`).join(", ")}` : ""}`,
  })
  refresh()
  return { ok: true, operationId, done, skipped }
}

export async function bulkRejectApplications(rawIds: number[], rawReason: string, sendEmail: boolean): Promise<BulkResult> {
  const actor = await requireOperator()
  const ids = cleanIds(rawIds)
  if (!ids) return { ok: false, error: `Select between 1 and ${MAX_BULK} applications.` }
  const reason = String(rawReason ?? "").trim().slice(0, 1000)
  if (reason.length < 3) return { ok: false, error: "A rejection reason is required." }
  const operationId = randomUUID()
  const rows = await loadLive(ids)
  const skipped: { id: number; reason: string }[] = ids.filter((id) => !rows.some((r) => r.id === id)).map((id) => ({ id, reason: "Not found" }))
  let done = 0
  for (const row of rows) {
    if (row.status === "rejected") { skipped.push({ id: row.id, reason: "Already rejected" }); continue }
    if (row.status === "approved") { skipped.push({ id: row.id, reason: "Approved: revoke the membership instead" }); continue }
    if (actor.role !== "admin" && !isPaymentConfirmed(row)) { skipped.push({ id: row.id, reason: "Payment unverified: Super Admin only" }); continue }
    await db
      .update(membershipApplications)
      .set({ status: "rejected", rejectionReason: reason, rejectedAt: new Date(), rejectedBy: actor.id })
      .where(eq(membershipApplications.id, row.id))
    if (sendEmail && row.completed) {
      await notify({
        email: row.email,
        type: "membership",
        title: "Update on your membership application",
        body: `After review, your membership application was not approved. Reason: ${reason}`,
        link: "/dashboard/applications",
        emailKey: "application.rejected",
        emailVars: { name: row.name },
      })
    }
    done++
  }
  await logActivity(actor, "application.bulk_reject", {
    entityType: "application",
    entityId: operationId,
    target: `${done} rejected, ${skipped.length} skipped`,
    details: `reason: ${reason}; email: ${sendEmail ? "yes" : "no"}; ids: ${ids.join(",")}`,
  })
  refresh()
  return { ok: true, operationId, done, skipped }
}

/** Archive hides records from the working lists but keeps them in statistics. Admin or Super Admin. */
export async function bulkArchiveApplications(rawIds: number[], archive: boolean): Promise<BulkResult> {
  const actor = await requireManager()
  const ids = cleanIds(rawIds)
  if (!ids) return { ok: false, error: `Select between 1 and ${MAX_BULK} applications.` }
  const operationId = randomUUID()
  const updated = await db
    .update(membershipApplications)
    .set(archive ? { archivedAt: new Date(), archivedBy: actor.id } : { archivedAt: null, archivedBy: null })
    .where(and(inArray(membershipApplications.id, ids), isNull(membershipApplications.deletedAt)))
    .returning({ id: membershipApplications.id })
  const skipped = ids.filter((id) => !updated.some((u) => u.id === id)).map((id) => ({ id, reason: "Not found" }))
  await logActivity(actor, archive ? "application.bulk_archive" : "application.bulk_unarchive", {
    entityType: "application",
    entityId: operationId,
    target: `${updated.length} ${archive ? "archived" : "restored"}`,
    details: `ids: ${ids.join(",")}`,
  })
  refresh()
  return { ok: true, operationId, done: updated.length, skipped }
}

/** Soft delete: Super Admin only, typed confirmation required. Approved applications are never bulk-deleted. */
export async function bulkDeleteApplications(rawIds: number[], confirmation: string): Promise<BulkResult> {
  const actor = await requireSuperAdmin()
  if (confirmation !== "DELETE") return { ok: false, error: 'Type DELETE to confirm.' }
  const ids = cleanIds(rawIds)
  if (!ids) return { ok: false, error: `Select between 1 and ${MAX_BULK} applications.` }
  const operationId = randomUUID()
  const rows = await loadLive(ids)
  const skipped: { id: number; reason: string }[] = ids.filter((id) => !rows.some((r) => r.id === id)).map((id) => ({ id, reason: "Not found" }))
  const deletable = rows.filter((r) => {
    if (r.status === "approved") { skipped.push({ id: r.id, reason: "Approved: delete individually" }); return false }
    return true
  })
  if (deletable.length) {
    await db
      .update(membershipApplications)
      .set({ deletedAt: new Date(), deletedBy: actor.id })
      .where(inArray(membershipApplications.id, deletable.map((r) => r.id)))
  }
  await logActivity(actor, "application.bulk_delete", {
    entityType: "application",
    entityId: operationId,
    target: `${deletable.length} soft-deleted, ${skipped.length} skipped`,
    details: deletable.map((r) => `${r.id} ${r.name} <${r.email}>`).join("; "),
  })
  refresh()
  return { ok: true, operationId, done: deletable.length, skipped }
}

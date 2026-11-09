"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/session"
import { sendManualInvitations, type SendSummary } from "@/lib/membership-invitations"

type Result = { ok: boolean; message: string; summary?: SendSummary }

export async function sendMembershipInvitations(userIds: string[]): Promise<Result> {
  try {
    const session = await getSession()
    if (!session?.user) throw new Error("Unauthorized")
    if (session.user.role !== "admin") throw new Error("Only administrators can send membership invitations.")
    const ids = [...new Set((Array.isArray(userIds) ? userIds : []).filter((id) => typeof id === "string" && id))]
    if (!ids.length) throw new Error("Select at least one registered user.")

    const summary = await sendManualInvitations(ids, session.user.email, ids.length > 1 ? "bulk" : "manual")
    revalidatePath("/admin/membership-funnel")
    const parts = [`${summary.sent} sent`]
    if (summary.skipped) parts.push(`${summary.skipped} skipped (recently emailed, unsubscribed, bounced or payment pending)`)
    if (summary.failed) parts.push(`${summary.failed} failed`)
    return { ok: summary.failed === 0 || summary.sent > 0, message: [parts.join(", "), summary.note].filter(Boolean).join(". "), summary }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[membership-funnel]", message)
    return { ok: false, message }
  }
}

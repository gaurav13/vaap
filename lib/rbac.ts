import { db } from "@/lib/db"
import { auditLogs, contentRevisions } from "@/lib/db/schema"
import { getSession } from "@/lib/session"

export type AdminActor = {
  id: string
  name: string
  email: string
  role: "admin" | "staff"
}

export const HIDDEN = "Hidden"

function toActor(u: { id: string; name?: string | null; email?: string | null; role?: string | null }): AdminActor {
  return { id: u.id, name: u.name ?? "", email: u.email ?? "", role: u.role === "admin" ? "admin" : "staff" }
}

/** Any admin-area user (Staff or Super Admin). Role is re-read from the DB every request, so revocation is immediate. */
export async function requireOperator(): Promise<AdminActor> {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin" && session.user.role !== "staff") throw new Error("Forbidden")
  return toActor(session.user)
}

export async function requireSuperAdmin(): Promise<AdminActor> {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin") throw new Error("Only a Super Admin can do this.")
  return toActor(session.user)
}

export async function currentOperator(): Promise<AdminActor | null> {
  const session = await getSession()
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "staff")) return null
  return toActor(session.user)
}

export const isSuperAdminActor = (actor: AdminActor | null | undefined) => actor?.role === "admin"

/** Activity log entry. Failures never block the primary action. */
export async function logActivity(
  actor: AdminActor,
  action: string,
  opts: { entityType?: string; entityId?: string | number; target?: string; details?: string } = {},
) {
  try {
    await db.insert(auditLogs).values({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      target: (opts.target ?? "").slice(0, 300),
      entityType: opts.entityType ?? "",
      entityId: opts.entityId === undefined ? "" : String(opts.entityId),
      details: (opts.details ?? "").slice(0, 2000),
    })
  } catch (err) {
    console.error("[audit] failed to record activity:", err)
  }
}

/** Snapshot a record before it changes so a Super Admin can restore it later. */
export async function saveRevision(
  actor: AdminActor,
  entityType: RevisionEntity,
  entityId: string | number,
  row: Record<string, unknown> | null | undefined,
  action = "update",
) {
  if (!row) return
  try {
    await db.insert(contentRevisions).values({
      entityType,
      entityId: String(entityId),
      snapshot: JSON.parse(JSON.stringify(row)),
      action,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
    })
  } catch (err) {
    console.error("[revisions] failed to save snapshot:", err)
  }
}

export type RevisionEntity = "news" | "event" | "article" | "kol_profile"

export const REVISION_LABELS: Record<RevisionEntity, string> = {
  news: "News post",
  event: "Event",
  article: "Article",
  kol_profile: "KOL profile",
}

/** Payment is "system-confirmed" for card checkouts and no-fee invites; crypto needs a Super Admin check. */
export function isPaymentConfirmed(app: {
  completed: boolean
  paymentMethod: string | null
  totalAmount: string | null
  paymentVerifiedAt: Date | null
}) {
  if (!app.completed) return false
  if (app.paymentVerifiedAt) return true
  if (app.totalAmount === "No payment required") return true
  return app.paymentMethod === "card"
}

import { db } from "@/lib/db"
import { auditLogs, contentRevisions } from "@/lib/db/schema"
import { getSession } from "@/lib/session"

export type AdminActor = {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "staff"
}

export const HIDDEN = "Hidden"

const isAreaRole = (r: string | null | undefined) => r === "admin" || r === "manager" || r === "staff"

function toActor(u: { id: string; name?: string | null; email?: string | null; role?: string | null }): AdminActor {
  const role = u.role === "admin" ? "admin" : u.role === "manager" ? "manager" : "staff"
  return { id: u.id, name: u.name ?? "", email: u.email ?? "", role }
}

/** Any admin-area user (Staff, Admin or Super Admin). Role is re-read from the DB every request, so revocation is immediate. */
export async function requireOperator(): Promise<AdminActor> {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (!isAreaRole(session.user.role)) throw new Error("Forbidden")
  return toActor(session.user)
}

/** Admin or Super Admin: operational management beyond Staff limits. */
export async function requireManager(): Promise<AdminActor> {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin" && session.user.role !== "manager") throw new Error("Only an Admin can do this.")
  return toActor(session.user)
}

/** Admin and Super Admin may see member contact details for operational work; Staff never do. */
export const canSeeContacts = (actor: AdminActor | null | undefined) =>
  actor?.role === "admin" || actor?.role === "manager"

export async function requireSuperAdmin(): Promise<AdminActor> {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin") throw new Error("Only a Super Admin can do this.")
  return toActor(session.user)
}

export async function currentOperator(): Promise<AdminActor | null> {
  const session = await getSession()
  if (!session?.user || !isAreaRole(session.user.role)) return null
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

/**
 * Payment counts only once it is verified: Stripe-confirmed card checkouts and
 * Super-Admin-checked crypto both set `paymentVerifiedAt`; no-fee invites need none.
 * Run `syncCardPaymentVerifications` first so fresh Stripe payments are recorded.
 */
export function isPaymentConfirmed(app: {
  completed: boolean
  paymentMethod: string | null
  totalAmount: string | null
  paymentVerifiedAt: Date | null
  invitationCode?: string | null
}) {
  if (!app.completed) return false
  if (app.paymentVerifiedAt) return true
  return app.totalAmount === "No payment required" || Boolean(app.invitationCode)
}

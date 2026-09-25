"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { settings, auditLogs } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { getAllCoreRoutes, getHiddenCoreRoutes, HIDDEN_CORE_ROUTES_KEY } from "@/lib/core-routes"

async function requireSuperAdmin() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (session.user.role !== "admin") throw new Error("Only the super admin can manage core pages")
  return session.user
}

async function saveHidden(next: string[], actor: { id: string; name?: string | null }, action: string, target: string) {
  const value = JSON.stringify([...new Set(next)].sort())
  await db
    .insert(settings)
    .values({ key: HIDDEN_CORE_ROUTES_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  try {
    await db.insert(auditLogs).values({ actorId: actor.id, actorName: actor.name ?? "", action, target })
  } catch {
    // audit failures must never block the write
  }
  revalidatePath("/admin/sitemap")
  revalidatePath("/sitemap.xml")
}

export async function deleteCoreRouteAction(href: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireSuperAdmin()
    if (href === "/") return { ok: false, error: "The home page cannot be removed from the sitemap." }
    if (!getAllCoreRoutes().some((r) => r.href === href)) return { ok: false, error: "Unknown core page." }
    const hidden = await getHiddenCoreRoutes()
    await saveHidden([...hidden, href], actor, "sitemap.core.delete", href)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete page." }
  }
}

export async function restoreCoreRouteAction(href: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireSuperAdmin()
    const hidden = await getHiddenCoreRoutes()
    await saveHidden(hidden.filter((h) => h !== href), actor, "sitemap.core.restore", href)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not restore page." }
  }
}

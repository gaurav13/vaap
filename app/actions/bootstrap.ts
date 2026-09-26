"use server"

import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { eq, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/**
 * Lets the currently signed-in user claim the admin role, but only while the
 * system has no admin or staff yet. This bootstraps the very first
 * super admin; afterwards role changes must go through an existing admin.
 */
export async function claimFirstAdmin() {
  const session = await getSession()
  if (!session?.user) return { ok: false, error: "You must be signed in." }

  const updated = await db.execute(sql`
    UPDATE "user"
    SET role = 'admin'
    WHERE id = ${session.user.id}
      AND NOT EXISTS (
        SELECT 1 FROM "user" WHERE role IN ('admin', 'staff')
      )
    RETURNING id
  `)
  const rows = Array.isArray(updated) ? updated : (updated as { rows?: unknown[] }).rows ?? []
  if (rows.length === 0) {
    return { ok: false, error: "An administrator already exists." }
  }
  revalidatePath("/dashboard")
  revalidatePath("/admin")
  return { ok: true }
}

export async function hasNoAdminYet() {
  const privileged = await db
    .select({ id: user.id })
    .from(user)
    .where(or(eq(user.role, "admin"), eq(user.role, "staff")))
  return privileged.length === 0
}

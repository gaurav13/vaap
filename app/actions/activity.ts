"use server"

import { eq, getTableColumns } from "drizzle-orm"
import type { PgTable } from "drizzle-orm/pg-core"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { articles, contentRevisions, events, kolProfiles, news } from "@/lib/db/schema"
import { logActivity, requireSuperAdmin, saveRevision, type RevisionEntity } from "@/lib/rbac"

const TABLES: Record<RevisionEntity, { table: PgTable; path: string }> = {
  news: { table: news, path: "/admin/news" },
  event: { table: events, path: "/admin/events" },
  article: { table: articles, path: "/admin/articles" },
  kol_profile: { table: kolProfiles, path: "/admin/kols" },
}

export async function restoreRevision(revisionId: number) {
  const actor = await requireSuperAdmin()
  if (!Number.isInteger(revisionId) || revisionId <= 0) return { ok: false as const, error: "Invalid revision." }

  const [rev] = await db.select().from(contentRevisions).where(eq(contentRevisions.id, revisionId)).limit(1)
  if (!rev) return { ok: false as const, error: "Revision not found." }

  const target = TABLES[rev.entityType as RevisionEntity]
  if (!target) return { ok: false as const, error: "This item type can't be restored." }

  const columns = getTableColumns(target.table) as Record<string, { columnType: string }>
  const idColumn = (target.table as unknown as Record<string, unknown>)["id"] as Parameters<typeof eq>[0]
  const idValue = /^\d+$/.test(rev.entityId) ? Number(rev.entityId) : rev.entityId

  const values: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rev.snapshot)) {
    if (key === "id" || !(key in columns)) continue
    const isTimestamp = columns[key].columnType === "PgTimestamp"
    values[key] = isTimestamp && typeof value === "string" ? new Date(value) : value
  }

  const [current] = await db.select().from(target.table).where(eq(idColumn, idValue)).limit(1)
  if (!current) return { ok: false as const, error: "The original item no longer exists." }

  await saveRevision(actor, rev.entityType as RevisionEntity, rev.entityId, current as Record<string, unknown>, "pre-restore")
  await db.update(target.table).set(values).where(eq(idColumn, idValue))
  await db
    .update(contentRevisions)
    .set({ restoredAt: new Date(), restoredBy: actor.name })
    .where(eq(contentRevisions.id, revisionId))
  await logActivity(actor, "restore", {
    entityType: rev.entityType,
    entityId: rev.entityId,
    details: `Restored revision #${revisionId}`,
  })

  revalidatePath(target.path)
  revalidatePath("/admin/activity")
  return { ok: true as const }
}

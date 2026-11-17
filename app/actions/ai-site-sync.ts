"use server"

import { revalidatePath } from "next/cache"
import { and, eq, isNotNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { aiKnowledgeSources, aiKnowledgeVersions } from "@/lib/db/schema"
import { requireManager, requireSuperAdmin, logActivity } from "@/lib/rbac"
import { replaceChunks } from "@/lib/ai-assistant/knowledge"
import { hashText, syncSiteKnowledge } from "@/lib/ai-assistant/site-sync"

export type SyncActionResult = { ok: true; message: string } | { ok: false; error: string }

const revalidate = () => {
  revalidatePath("/admin/ai")
  revalidatePath("/admin/ai-knowledge")
}

export async function runWebsiteSync(): Promise<SyncActionResult> {
  try {
    const actor = await requireManager()
    const r = await syncSiteKnowledge()
    await logActivity(actor, "ai_knowledge.site_sync", { entityType: "ai_knowledge_sources", target: "website" })
    revalidate()
    const parts = [`${r.created} added`, `${r.updated} updated`, `${r.unchanged} unchanged`, `${r.removed} removed`]
    if (r.pendingReview) parts.push(`${r.pendingReview} waiting for review`)
    if (r.failed.length) parts.push(`${r.failed.length} failed`)
    return { ok: true, message: `Sync finished: ${parts.join(", ")}.` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed." }
  }
}

/** Approves or discards a synced change to a sensitive page (privacy, terms, disclaimer, official status). */
export async function reviewSyncedChange(id: number, decision: "approve" | "reject"): Promise<SyncActionResult> {
  try {
    const actor = await requireSuperAdmin()
    const [src] = await db
      .select()
      .from(aiKnowledgeSources)
      .where(and(eq(aiKnowledgeSources.id, id), isNotNull(aiKnowledgeSources.pendingContent)))
    if (!src?.pendingContent) throw new Error("This change was already reviewed.")

    const now = new Date()
    if (decision === "reject") {
      await db
        .update(aiKnowledgeSources)
        .set({ pendingContent: null, requiresReview: false, updatedAt: now })
        .where(eq(aiKnowledgeSources.id, id))
    } else {
      const text = src.pendingContent
      const version = src.version + 1
      const chunkCount = await replaceChunks(id, text)
      await db
        .update(aiKnowledgeSources)
        .set({
          content: text,
          charCount: text.length,
          chunkCount,
          contentHash: hashText(text),
          version,
          pendingContent: null,
          requiresReview: false,
          reviewedBy: actor.id,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(eq(aiKnowledgeSources.id, id))
      await db.insert(aiKnowledgeVersions).values({
        sourceId: id,
        version,
        action: "approved_sync",
        title: src.title,
        content: text,
        changedBy: actor.id,
        changedByName: actor.name,
      })
    }
    await logActivity(actor, `ai_knowledge.sync_${decision}`, { entityType: "ai_knowledge_sources", entityId: id })
    revalidate()
    return { ok: true, message: decision === "approve" ? "Change approved and live." : "Change discarded; the previous text stays live." }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }
  }
}

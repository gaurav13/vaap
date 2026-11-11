"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { aiKnowledgeSources } from "@/lib/db/schema"
import { requireManager, requireSuperAdmin, logActivity, type AdminActor } from "@/lib/rbac"
import { KNOWLEDGE_CATEGORIES, readDocument, readUrl, replaceChunks, searchKnowledge } from "@/lib/ai-assistant/knowledge"

export type KnowledgeResult = { ok: true; message: string } | { ok: false; error: string }

const category = z.enum(KNOWLEDGE_CATEGORIES)
const PATH = "/admin/ai-knowledge"

const revalidate = () => {
  revalidatePath(PATH)
  revalidatePath("/admin/ai")
}

/** A Super Admin's source goes live immediately; anyone else's waits for Super Admin approval. */
async function save(
  actor: AdminActor,
  data: { title: string; kind: string; category: string; text: string; sourceUrl?: string | null; fileName?: string | null },
) {
  if (data.text.length < 40) throw new Error("Not enough readable text was found in that source.")
  const approved = actor.role === "admin"
  const [row] = await db
    .insert(aiKnowledgeSources)
    .values({
      title: data.title.slice(0, 200),
      kind: data.kind,
      category: data.category,
      sourceUrl: data.sourceUrl ?? null,
      fileName: data.fileName ?? null,
      content: data.text,
      charCount: data.text.length,
      createdBy: actor.id,
      status: approved ? "approved" : "pending",
      ...(approved ? { reviewedBy: actor.id, reviewedAt: new Date() } : {}),
    })
    .returning({ id: aiKnowledgeSources.id })
  const chunkCount = await replaceChunks(row.id, data.text)
  await db.update(aiKnowledgeSources).set({ chunkCount }).where(eq(aiKnowledgeSources.id, row.id))
  return chunkCount
}

function fail(e: unknown): KnowledgeResult {
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }
}

export async function addKnowledgeSource(_: KnowledgeResult | null, form: FormData): Promise<KnowledgeResult> {
  try {
    const actor = await requireManager()
    const mode = String(form.get("mode") ?? "")
    const cat = category.parse(form.get("category") ?? "general")
    const title = String(form.get("title") ?? "").trim()

    let chunks: number
    if (mode === "url") {
      const page = await readUrl(String(form.get("url") ?? "").trim())
      chunks = await save(actor, { title: title || page.title, kind: "url", category: cat, text: page.text, sourceUrl: page.url })
    } else if (mode === "file") {
      const file = form.get("file")
      if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload.")
      const doc = await readDocument(file)
      chunks = await save(actor, { title: title || file.name, kind: doc.kind, category: cat, text: doc.text, fileName: file.name })
    } else {
      const text = String(form.get("text") ?? "").trim().slice(0, 400_000)
      if (!title) throw new Error("Add a title.")
      chunks = await save(actor, { title, kind: "text", category: cat, text })
    }

    await logActivity(actor, "ai_knowledge.add", { entityType: "ai_knowledge_sources", target: title || mode })
    revalidate()
    return {
      ok: true,
      message: `Indexed into ${chunks} section${chunks === 1 ? "" : "s"}. ${actor.role === "admin" ? "It is live now." : "A Super Admin must approve it before the assistant uses it."}`,
    }
  } catch (e) {
    return fail(e)
  }
}

export async function setKnowledgeActive(id: number, active: boolean) {
  const actor = await requireManager()
  await db.update(aiKnowledgeSources).set({ active, updatedAt: new Date() }).where(eq(aiKnowledgeSources.id, id))
  await logActivity(actor, active ? "ai_knowledge.enable" : "ai_knowledge.disable", { entityType: "ai_knowledge_sources", entityId: id })
  revalidate()
}

export async function refreshKnowledgeUrl(id: number): Promise<KnowledgeResult> {
  try {
    const actor = await requireManager()
    const [src] = await db.select().from(aiKnowledgeSources).where(eq(aiKnowledgeSources.id, id))
    if (!src?.sourceUrl) throw new Error("Only website sources can be refreshed.")
    const page = await readUrl(src.sourceUrl)
    const chunkCount = await replaceChunks(id, page.text)
    await db
      .update(aiKnowledgeSources)
      .set({
        content: page.text,
        charCount: page.text.length,
        chunkCount,
        updatedAt: new Date(),
        version: src.version + 1,
        ...(actor.role === "admin" ? {} : { status: "pending" }),
      })
      .where(eq(aiKnowledgeSources.id, id))
    await logActivity(actor, "ai_knowledge.refresh", { entityType: "ai_knowledge_sources", entityId: id })
    revalidate()
    return { ok: true, message: "Page re-read and re-indexed." }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteKnowledgeSource(id: number) {
  const actor = await requireSuperAdmin()
  await db.delete(aiKnowledgeSources).where(eq(aiKnowledgeSources.id, id))
  await logActivity(actor, "ai_knowledge.delete", { entityType: "ai_knowledge_sources", entityId: id })
  revalidate()
}

export async function testKnowledgeSearch(query: string) {
  await requireManager()
  const q = query.trim().slice(0, 300)
  if (!q) return []
  const rows = await searchKnowledge(q, undefined, 5)
  return rows.map((r) => ({ title: r.title, category: r.category, excerpt: r.content.slice(0, 280) }))
}

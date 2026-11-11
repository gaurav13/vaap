"use server"

import { revalidatePath } from "next/cache"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { aiAnswerCorrections, aiCorrectionVersions, aiKnowledgeSources, aiUsageLogs } from "@/lib/db/schema"
import { logActivity, requireManager, requireSuperAdmin, type AdminActor } from "@/lib/rbac"
import { saveAiSettings } from "@/lib/ai-assistant/settings"
import { TOPICS, aiSettingsSchema, type AiSettings } from "@/lib/ai-assistant/config"

const PATH = "/admin/ai"

export type ActionResult = { ok: true; message: string } | { ok: false; error: string }

const fail = (e: unknown): ActionResult => ({ ok: false, error: e instanceof Error ? e.message : "Something went wrong." })

const correctionInput = z.object({
  question: z.string().trim().min(5, "Enter the question.").max(1000),
  correctedAnswer: z.string().trim().min(10, "Write the corrected answer.").max(6000),
  keywords: z.string().trim().max(400).default(""),
  topic: z.enum(TOPICS).default("general"),
})

async function recordVersion(
  actor: AdminActor,
  correctionId: number,
  version: number,
  action: string,
  correctedAnswer: string,
  note = "",
) {
  await db.insert(aiCorrectionVersions).values({
    correctionId,
    version,
    action,
    correctedAnswer,
    note: note.slice(0, 1000),
    changedBy: actor.id,
    changedByName: actor.name,
  })
}

/** Staff and Super Admins can draft corrections. Only a Super Admin's correction can go live without review. */
export async function createCorrection(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const actor = await requireManager()
    const data = correctionInput.parse({
      question: form.get("question"),
      correctedAnswer: form.get("correctedAnswer"),
      keywords: form.get("keywords") ?? "",
      topic: form.get("topic") || "general",
    })
    const intent = String(form.get("intent") ?? "submit")
    const usageLogId = Number(form.get("usageLogId")) || null

    let originalAnswer = ""
    if (usageLogId) {
      const [log] = await db.select({ answer: aiUsageLogs.answer }).from(aiUsageLogs).where(eq(aiUsageLogs.id, usageLogId))
      originalAnswer = log?.answer ?? ""
    }

    const status = intent === "draft" ? "draft" : intent === "approve" && actor.role === "admin" ? "approved" : "pending"
    const [row] = await db
      .insert(aiAnswerCorrections)
      .values({
        ...data,
        usageLogId,
        originalAnswer,
        status,
        createdBy: actor.id,
        createdByName: actor.name,
        ...(status === "approved" ? { reviewedBy: actor.id, reviewedAt: new Date() } : {}),
      })
      .returning({ id: aiAnswerCorrections.id })
    await recordVersion(actor, row.id, 1, status === "approved" ? "approved" : status === "draft" ? "created" : "submitted", data.correctedAnswer)
    await logActivity(actor, `ai_correction.${status === "approved" ? "approve" : status === "draft" ? "draft" : "submit"}`, {
      entityType: "ai_answer_corrections",
      entityId: row.id,
      target: data.question.slice(0, 120),
    })
    revalidatePath(PATH)
    return {
      ok: true,
      message:
        status === "approved"
          ? "Correction approved. The assistant will use it from now on."
          : status === "draft"
            ? "Draft saved."
            : "Submitted for Super Admin approval.",
    }
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Check the form." }
    return fail(e)
  }
}

/** Editing creates a new version. Non-Super-Admin edits send the correction back for review. */
export async function updateCorrection(id: number, input: { correctedAnswer: string; keywords: string; topic: string; note: string }): Promise<ActionResult> {
  try {
    const actor = await requireManager()
    const data = correctionInput.pick({ correctedAnswer: true, keywords: true, topic: true }).parse(input)
    const [cur] = await db.select().from(aiAnswerCorrections).where(eq(aiAnswerCorrections.id, id))
    if (!cur) throw new Error("Correction not found.")
    if (actor.role !== "admin" && cur.createdBy !== actor.id && cur.status !== "draft" && cur.status !== "pending")
      throw new Error("Only a Super Admin can edit an approved correction.")
    const version = cur.version + 1
    const status = actor.role === "admin" ? cur.status : cur.status === "draft" ? "draft" : "pending"
    await db
      .update(aiAnswerCorrections)
      .set({ ...data, version, status, updatedAt: new Date() })
      .where(eq(aiAnswerCorrections.id, id))
    await recordVersion(actor, id, version, "edited", data.correctedAnswer, input.note)
    await logActivity(actor, "ai_correction.edit", { entityType: "ai_answer_corrections", entityId: id, details: input.note })
    revalidatePath(PATH)
    return { ok: true, message: status === "pending" && cur.status === "approved" ? "Saved. Waiting for re-approval." : "Saved." }
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Check the form." }
    return fail(e)
  }
}

export async function submitCorrection(id: number): Promise<ActionResult> {
  try {
    const actor = await requireManager()
    const [cur] = await db.select().from(aiAnswerCorrections).where(eq(aiAnswerCorrections.id, id))
    if (!cur || cur.status !== "draft") throw new Error("Only drafts can be submitted.")
    await db.update(aiAnswerCorrections).set({ status: "pending", updatedAt: new Date() }).where(eq(aiAnswerCorrections.id, id))
    await recordVersion(actor, id, cur.version, "submitted", cur.correctedAnswer)
    await logActivity(actor, "ai_correction.submit", { entityType: "ai_answer_corrections", entityId: id })
    revalidatePath(PATH)
    return { ok: true, message: "Submitted for approval." }
  } catch (e) {
    return fail(e)
  }
}

export async function reviewCorrection(id: number, decision: "approve" | "reject" | "withdraw", note = ""): Promise<ActionResult> {
  try {
    const actor = await requireSuperAdmin()
    const [cur] = await db.select().from(aiAnswerCorrections).where(eq(aiAnswerCorrections.id, id))
    if (!cur) throw new Error("Correction not found.")
    const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "withdrawn"
    await db
      .update(aiAnswerCorrections)
      .set({ status, reviewedBy: actor.id, reviewedAt: new Date(), reviewNote: note.slice(0, 1000), updatedAt: new Date() })
      .where(eq(aiAnswerCorrections.id, id))
    await recordVersion(actor, id, cur.version, status, cur.correctedAnswer, note)
    await logActivity(actor, `ai_correction.${decision}`, { entityType: "ai_answer_corrections", entityId: id, details: note })
    revalidatePath(PATH)
    return { ok: true, message: `Correction ${status}.` }
  } catch (e) {
    return fail(e)
  }
}

export async function restoreCorrectionVersion(id: number, versionId: number): Promise<ActionResult> {
  try {
    const actor = await requireSuperAdmin()
    const [[cur], [ver]] = await Promise.all([
      db.select().from(aiAnswerCorrections).where(eq(aiAnswerCorrections.id, id)),
      db
        .select()
        .from(aiCorrectionVersions)
        .where(and(eq(aiCorrectionVersions.id, versionId), eq(aiCorrectionVersions.correctionId, id))),
    ])
    if (!cur || !ver) throw new Error("Version not found.")
    const version = cur.version + 1
    await db
      .update(aiAnswerCorrections)
      .set({ correctedAnswer: ver.correctedAnswer, version, updatedAt: new Date() })
      .where(eq(aiAnswerCorrections.id, id))
    await recordVersion(actor, id, version, "restored", ver.correctedAnswer, `Restored version ${ver.version}`)
    await logActivity(actor, "ai_correction.restore", { entityType: "ai_answer_corrections", entityId: id, details: `v${ver.version}` })
    revalidatePath(PATH)
    return { ok: true, message: `Restored version ${ver.version}.` }
  } catch (e) {
    return fail(e)
  }
}

export async function getCorrectionHistory(id: number) {
  await requireManager()
  return db
    .select()
    .from(aiCorrectionVersions)
    .where(eq(aiCorrectionVersions.correctionId, id))
    .orderBy(desc(aiCorrectionVersions.createdAt))
}

export async function reviewKnowledgeSource(id: number, decision: "approved" | "rejected"): Promise<ActionResult> {
  try {
    const actor = await requireSuperAdmin()
    await db.update(aiKnowledgeSources).set({ status: decision, reviewedBy: actor.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(aiKnowledgeSources.id, id))
    await logActivity(actor, `ai_knowledge.${decision === "approved" ? "approve" : "reject"}`, {
      entityType: "ai_knowledge_sources",
      entityId: id,
    })
    revalidatePath(PATH)
    return { ok: true, message: decision === "approved" ? "Approved. The assistant can now use it." : "Rejected." }
  } catch (e) {
    return fail(e)
  }
}

export async function updateAiSettings(next: AiSettings): Promise<ActionResult> {
  try {
    const actor = await requireSuperAdmin()
    const parsed = aiSettingsSchema.safeParse(next)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." }
    await saveAiSettings(parsed.data, actor.id)
    await logActivity(actor, "ai_settings.update", {
      entityType: "ai_settings",
      entityId: 1,
      details: `enabled=${parsed.data.enabled} shutdown=${parsed.data.emergencyShutdown} model=${parsed.data.defaultModel} monthly=$${parsed.data.monthlyBudgetUsd} daily=$${parsed.data.dailyBudgetUsd}`,
    })
    revalidatePath(PATH)
    return { ok: true, message: "Settings saved. They apply to the next request." }
  } catch (e) {
    return fail(e)
  }
}

export async function setEmergencyShutdown(on: boolean): Promise<ActionResult> {
  try {
    const actor = await requireSuperAdmin()
    const { getAiSettings } = await import("@/lib/ai-assistant/settings")
    const { updatedAt: _ignored, ...current } = await getAiSettings()
    await saveAiSettings({ ...current, emergencyShutdown: on }, actor.id)
    await logActivity(actor, on ? "ai_settings.shutdown_on" : "ai_settings.shutdown_off", { entityType: "ai_settings", entityId: 1 })
    revalidatePath(PATH)
    return { ok: true, message: on ? "Paid AI is off. Visitors get free answers only." : "Paid AI is back on." }
  } catch (e) {
    return fail(e)
  }
}

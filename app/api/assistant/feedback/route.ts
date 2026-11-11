import { and, eq, or } from "drizzle-orm"
import { cookies } from "next/headers"
import { getSession } from "@/lib/session"
import { z } from "zod"
import { db } from "@/lib/db"
import { aiFeedback, aiUsageLogs } from "@/lib/db/schema"

const schema = z.object({
  requestId: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(-1)]),
  comment: z.string().max(1000).optional(),
})

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return new Response("Invalid feedback.", { status: 400 })

  const [cookieStore, session] = await Promise.all([cookies(), getSession().catch(() => null)])
  const sessionId = cookieStore.get("vaap_ai_sid")?.value ?? ""
  const userId = session?.user?.id
  if (!sessionId && !userId) return new Response("No conversation found.", { status: 403 })

  const { requestId, rating, comment = "" } = parsed.data
  // Feedback is only accepted for answers given to this browser session or to the signed-in user (e.g. restored on another device).
  const owner = userId
    ? sessionId
      ? or(eq(aiUsageLogs.sessionId, sessionId), eq(aiUsageLogs.userId, userId))
      : eq(aiUsageLogs.userId, userId)
    : eq(aiUsageLogs.sessionId, sessionId)
  const [log] = await db
    .select({ question: aiUsageLogs.question, conversationId: aiUsageLogs.conversationId, userId: aiUsageLogs.userId })
    .from(aiUsageLogs)
    .where(and(eq(aiUsageLogs.requestId, requestId), owner))
    .limit(1)
  if (!log) return new Response("Answer not found.", { status: 404 })

  await db
    .insert(aiFeedback)
    .values({
      requestId,
      messageId: requestId,
      conversationId: log.conversationId,
      rating,
      comment: comment.trim(),
      question: log.question,
      userId: log.userId,
      sessionId,
    })
    .onConflictDoUpdate({ target: aiFeedback.messageId, set: { rating, comment: comment.trim(), resolved: false } })

  return Response.json({ ok: true })
}

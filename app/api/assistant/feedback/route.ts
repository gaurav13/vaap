import { and, eq } from "drizzle-orm"
import { cookies } from "next/headers"
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

  const sessionId = (await cookies()).get("vaap_ai_sid")?.value
  if (!sessionId) return new Response("No conversation found.", { status: 403 })

  const { requestId, rating, comment = "" } = parsed.data
  // Feedback is only accepted for answers given to this browser session.
  const [log] = await db
    .select({ question: aiUsageLogs.question, conversationId: aiUsageLogs.conversationId, userId: aiUsageLogs.userId })
    .from(aiUsageLogs)
    .where(and(eq(aiUsageLogs.requestId, requestId), eq(aiUsageLogs.sessionId, sessionId)))
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

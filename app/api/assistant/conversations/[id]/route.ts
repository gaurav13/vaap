import { after } from "next/server"
import { getSession } from "@/lib/session"
import {
  CONVERSATION_ID,
  deleteConversation,
  getConversation,
  purgeDeletedConversations,
  renameConversation,
} from "@/lib/ai-assistant/history"

type Ctx = { params: Promise<{ id: string }> }
const NO_STORE = { "Cache-Control": "private, no-store" }

async function authorize(ctx: Ctx) {
  const { id } = await ctx.params
  if (!CONVERSATION_ID.test(id)) return { error: new Response("Not found", { status: 404 }) }
  const session = await getSession().catch(() => null)
  if (!session?.user) return { error: new Response("Please sign in.", { status: 401 }) }
  return { id, userId: session.user.id }
}

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await authorize(ctx)
  if ("error" in auth) return auth.error
  const conversation = await getConversation(auth.id, auth.userId)
  // Same response whether it was deleted or belongs to someone else, so ids cannot be probed.
  if (!conversation) return new Response("Not found", { status: 404 })
  return Response.json(conversation, { headers: NO_STORE })
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await authorize(ctx)
  if ("error" in auth) return auth.error
  const body = (await req.json().catch(() => null)) as { title?: unknown } | null
  if (typeof body?.title !== "string") return new Response("Enter a name.", { status: 400 })
  const ok = await renameConversation(auth.id, auth.userId, body.title)
  return ok ? Response.json({ ok: true }) : new Response("Not found", { status: 404 })
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await authorize(ctx)
  if ("error" in auth) return auth.error
  const ok = await deleteConversation(auth.id, auth.userId)
  after(() => purgeDeletedConversations().catch(() => {}))
  return ok ? Response.json({ ok: true }) : new Response("Not found", { status: 404 })
}

import { getSession } from "@/lib/session"
import { listConversations } from "@/lib/ai-assistant/history"

export async function GET() {
  const session = await getSession().catch(() => null)
  const headers = { "Cache-Control": "private, no-store" }
  if (!session?.user) return Response.json({ signedIn: false, conversations: [] }, { headers })
  const conversations = await listConversations(session.user.id)
  return Response.json({ signedIn: true, conversations }, { headers })
}

import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getAiSettings } from "@/lib/ai-assistant/settings"
import { getUsageState, ipSubject } from "@/lib/ai-assistant/usage-limits"

/** Read-only allowance for the chat UI. Never consumes a question. */
export async function GET(req: Request) {
  try {
    const [settings, session, cookieStore] = await Promise.all([getAiSettings(), getSession().catch(() => null), cookies()])
    const sessionId = cookieStore.get("vaap_ai_sid")?.value ?? ""
    const viewer = session?.user ? { id: session.user.id, email: session.user.email } : null
    const state = await getUsageState({ viewer, sessionId: /^[\w-]{20,64}$/.test(sessionId) ? sessionId : "none", ip: ipSubject(req), settings })
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    console.error("[assistant] usage failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}

import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { aiUpgradeClicks } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { resolveTier } from "@/lib/ai-assistant/usage-limits"

const TARGETS = new Set(["plans", "status", "signin"])

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { target?: string }
  if (!body.target || !TARGETS.has(body.target)) return new Response(null, { status: 400 })
  const [session, cookieStore] = await Promise.all([getSession().catch(() => null), cookies()])
  const viewer = session?.user ? { id: session.user.id, email: session.user.email } : null
  try {
    await db.insert(aiUpgradeClicks).values({
      userId: viewer?.id ?? null,
      sessionId: cookieStore.get("vaap_ai_sid")?.value?.slice(0, 64) ?? null,
      tier: await resolveTier(viewer),
      target: body.target,
    })
  } catch (err) {
    console.error("[assistant] upgrade click log failed:", err instanceof Error ? err.message : err)
  }
  return new Response(null, { status: 204 })
}

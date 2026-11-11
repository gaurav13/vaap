import { NextResponse } from "next/server"
import { budgetHasRoom, getSpend } from "@/lib/ai-assistant/budget"
import { getAiSettings, toPublicConfig } from "@/lib/ai-assistant/settings"

export async function GET() {
  try {
    const [settings, spend] = await Promise.all([getAiSettings(), getSpend()])
    return NextResponse.json(toPublicConfig(settings, budgetHasRoom(settings, spend)), {
      headers: { "Cache-Control": "private, max-age=60" },
    })
  } catch (err) {
    console.error("[assistant] config failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ available: true, aiEnabled: false, languages: ["en"], welcome: {}, quickActions: [] })
  }
}

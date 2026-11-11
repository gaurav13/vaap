import { NextResponse } from "next/server"
import { runDueAutomations } from "@/lib/email-automations/engine"
import { runKolMaintenance } from "@/lib/kol"
import { getAutomation, runAutomationScan } from "@/lib/social-agent/service"
import { publishDueScheduled } from "@/lib/social-agent/publishing"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  // Fail closed in production so the endpoint cannot be triggered publicly without CRON_SECRET.
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : process.env.NODE_ENV !== "production"
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const results = await runDueAutomations()
  const kol = await runKolMaintenance().catch((error) => ({ error: error instanceof Error ? error.message : "failed" }))
  // AI Social Media Agent: the scan only drafts. Publishing happens solely for posts a Super Admin approved and scheduled.
  const social = await getAutomation()
    .then(async (a): Promise<object> => (a.enabled ? runAutomationScan() : { skipped: true }))
    .catch((error) => ({ error: error instanceof Error ? error.message : "failed" }))
  const scheduled = await publishDueScheduled().catch((error) => ({ error: error instanceof Error ? error.message : "failed" }))
  return NextResponse.json({ ok: true, results, kol, social, scheduled })
}

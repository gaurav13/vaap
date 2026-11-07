import { NextResponse } from "next/server"
import { runDueAutomations } from "@/lib/email-automations/engine"

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
  return NextResponse.json({ ok: true, results })
}

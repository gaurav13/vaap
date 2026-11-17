import { NextResponse } from "next/server"
import { processNewsletterQueue } from "@/lib/newsletter/engine"

export const maxDuration = 300

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  // Fail closed in production so the queue cannot be triggered publicly without CRON_SECRET.
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : process.env.NODE_ENV !== "production"
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const result = await processNewsletterQueue({ budgetMs: 270_000 })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("[newsletters] queue run failed:", err)
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "failed" }, { status: 500 })
  }
}

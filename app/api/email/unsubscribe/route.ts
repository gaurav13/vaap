import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/email-tokens"
import { suppress } from "@/lib/email-automations/engine"

// GET shows a confirmation page (link scanners must not unsubscribe people);
// POST is the RFC 8058 one-click unsubscribe used by mail clients.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const target = new URL("/email/unsubscribe", url)
  target.searchParams.set("token", url.searchParams.get("token") ?? "")
  return NextResponse.redirect(target)
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const payload = verifyToken(url.searchParams.get("token"), "unsubscribe")
  if (!payload?.topic) return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 })
  await suppress(payload.email, payload.topic, "One-click unsubscribe", "recipient")
  return NextResponse.json({ ok: true })
}

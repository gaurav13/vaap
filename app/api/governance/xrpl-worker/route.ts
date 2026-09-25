import { NextResponse } from "next/server"
import crypto from "crypto"
import { getSession, isStaff } from "@/lib/session"
import { drainXrplQueue } from "@/lib/xrpl-worker"

export const runtime = "nodejs"
export const maxDuration = 60

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
}

/** Accepts a Vercel Cron bearer (CRON_SECRET), an x-worker-key (BETTER_AUTH_SECRET), or a staff session. */
async function isAuthorized(req: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (cronSecret && bearer && safeEqual(bearer, cronSecret)) return true

  const workerKey = req.headers.get("x-worker-key")
  const authSecret = process.env.BETTER_AUTH_SECRET
  if (workerKey && authSecret && safeEqual(workerKey, authSecret)) return true

  return getSession()
    .then((s) => Boolean(s?.user && isStaff(s.user.role)))
    .catch(() => false)
}

async function handle(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const { processed, remaining } = await drainXrplQueue(10)
  return NextResponse.json({ ok: true, processed, remaining })
}

export const GET = handle
export const POST = handle

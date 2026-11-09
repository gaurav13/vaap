import { NextResponse, type NextRequest } from "next/server"
import { recordReferralClick, resolveReferralCode } from "@/lib/referral-engine"
import { normalizeReferralCode, REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE } from "@/lib/referral"

// Public referral entry point. A referrer shares /join?ref=CODE. We record the
// click for analytics, drop a first-party attribution cookie, then forward the
// visitor into the membership application. A reward is never created here.
export async function GET(req: NextRequest) {
  const code = normalizeReferralCode(req.nextUrl.searchParams.get("ref") ?? req.nextUrl.searchParams.get("code"))

  const dest = req.nextUrl.clone()
  dest.pathname = "/membership/apply"
  dest.search = ""

  let resolvedCode = ""
  if (code) {
    try {
      const resolved = await resolveReferralCode(code)
      if (resolved) {
        resolvedCode = resolved.code
        await recordReferralClick(resolved.code, req.headers.get("referer") ?? "")
      }
    } catch (err) {
      console.log("[v0] referral resolve failed:", err instanceof Error ? err.message : err)
    }
  }

  if (resolvedCode) dest.searchParams.set("ref", resolvedCode)
  // Relative Location: the browser resolves it against the host it actually
  // requested, so the redirect can never leak an internal/localhost origin.
  const res = new NextResponse(null, { status: 307, headers: { Location: `${dest.pathname}${dest.search}` } })
  if (resolvedCode) {
    res.cookies.set(REFERRAL_COOKIE, resolvedCode, {
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    })
  }
  return res
}

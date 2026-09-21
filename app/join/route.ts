import { NextResponse, type NextRequest } from "next/server"
import { recordReferralClick, resolveReferralCode } from "@/lib/referral-engine"

// Public referral entry point. A referrer shares /join?ref=CODE. We record the
// click for analytics, drop a first-party attribution cookie, then forward the
// visitor into the membership application. A reward is never created here.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = (searchParams.get("ref") ?? searchParams.get("code") ?? "").trim()

  const dest = new URL("/membership/apply", origin)
  const res = NextResponse.redirect(dest)

  if (code) {
    try {
      const resolved = await resolveReferralCode(code)
      if (resolved) {
        await recordReferralClick(code, req.headers.get("referer") ?? "")
        // 60-day attribution window, first-party, lax so it survives the flow.
        res.cookies.set("vaap_ref", resolved.code, {
          maxAge: 60 * 60 * 24 * 60,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
        dest.searchParams.set("ref", resolved.code)
        return NextResponse.redirect(dest, { headers: res.headers })
      }
    } catch {
      // Ignore bad codes — still forward the visitor to the application.
    }
  }

  return res
}

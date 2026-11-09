import { NextResponse, type NextRequest } from "next/server"
import { normalizeReferralCode, REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE } from "@/lib/referral"

// Lightweight proxy (Next.js 16 middleware): it forwards the current pathname
// to Server Components via a request header so the root layout can decide
// whether to show the "Launching Soon" page. No DB or auth work happens here —
// the node-postgres driver is not edge-compatible, so gating is done in the
// root layout which runs on the Node runtime.
//
// It also captures `?ref=CODE` on any page (e.g. links shared directly as
// /membership/apply?ref=CODE, bypassing /join) into the attribution cookie.
// The code is validated against the database later, when the application is
// submitted, so an unknown code here is harmless.
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)
  const res = NextResponse.next({ request: { headers: requestHeaders } })

  const path = request.nextUrl.pathname
  if (!path.startsWith("/join") && !path.startsWith("/api") && !path.startsWith("/admin")) {
    const ref = normalizeReferralCode(request.nextUrl.searchParams.get("ref"))
    if (ref && request.cookies.get(REFERRAL_COOKIE)?.value !== ref) {
      res.cookies.set(REFERRAL_COOKIE, ref, {
        maxAge: REFERRAL_COOKIE_MAX_AGE,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      })
    }
  }
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

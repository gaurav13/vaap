import { NextResponse, type NextRequest } from "next/server"

// Lightweight proxy (Next.js 16 middleware): it only forwards the current
// pathname to Server Components via a request header so the root layout can
// decide whether to show the "Launching Soon" page. No DB or auth work happens
// here — the node-postgres driver is not edge-compatible, so gating is done in
// the root layout which runs on the Node runtime.
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

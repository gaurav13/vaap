import { NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/rbac"
import { PLATFORM_KEYS, type PlatformKey } from "@/lib/social-agent/config"
import { authorizeUrl, isAppConfigured, randomToken } from "@/lib/social-agent/oauth"
import { OAUTH_COOKIE, cookieOptions, requestOrigin, sealState } from "@/lib/social-agent/oauth-state"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params
  const back = (query: Record<string, string>) =>
    NextResponse.redirect(`${requestOrigin(request)}/admin/social-agent?${new URLSearchParams({ tab: "accounts", ...query })}`)

  let actor
  try {
    actor = await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: "Only a Super Admin can connect social accounts." }, { status: 403 })
  }
  if (!PLATFORM_KEYS.includes(platform as PlatformKey)) return back({ oauth_error: "Unknown platform." })
  const key = platform as PlatformKey
  if (!isAppConfigured(key)) return back({ platform: key, oauth_error: "The platform app credentials are not configured on the server yet." })

  const state = randomToken()
  const verifier = randomToken()
  const res = NextResponse.redirect(authorizeUrl(key, state, verifier))
  res.cookies.set(OAUTH_COOKIE, sealState({ state, verifier, platform: key, uid: actor.id }), cookieOptions)
  return res
}

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { logActivity, requireSuperAdmin } from "@/lib/rbac"
import { platformLabel, type PlatformKey } from "@/lib/social-agent/config"
import { exchangeCode, safeEqual } from "@/lib/social-agent/oauth"
import { OAUTH_COOKIE, cookieOptions, openState, requestOrigin } from "@/lib/social-agent/oauth-state"
import { completeOAuth } from "@/lib/social-agent/publishing"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  const url = new URL(request.url)
  const jar = await cookies()
  const saved = openState(jar.get(OAUTH_COOKIE)?.value)
  jar.set(OAUTH_COOKIE, "", { ...cookieOptions, maxAge: 0 })

  const back = (query: Record<string, string>) =>
    NextResponse.redirect(`${requestOrigin(request)}/admin/social-agent?${new URLSearchParams({ tab: "accounts", ...query })}`)

  let actor
  try {
    actor = await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: "Only a Super Admin can connect social accounts." }, { status: 403 })
  }

  const state = url.searchParams.get("state") ?? ""
  if (!saved || !state || !safeEqual(saved.state, state) || saved.uid !== actor.id) {
    return back({ oauth_error: "The connection request expired or did not start from this browser. Click Connect again." })
  }
  const platform = saved.platform as PlatformKey

  const denied = url.searchParams.get("error_description") || url.searchParams.get("error")
  if (denied) return back({ platform, oauth_error: `Authorization was cancelled or denied: ${denied}`.slice(0, 300) })

  const code = url.searchParams.get("code")
  if (!code) return back({ platform, oauth_error: "The platform did not return an authorization code." })

  try {
    const result = await exchangeCode(platform, code, saved.verifier)
    const outcome = await completeOAuth(platform, result, actor.id)
    await logActivity(actor, "social_agent.oauth_connect", { entityType: "social_agent", target: platformLabel(platform) })
    if (!outcome.selected) return back({ platform, oauth: "select" })
    return outcome.test.ok ? back({ platform, oauth: "connected" }) : back({ platform, oauth_error: outcome.test.error })
  } catch (error) {
    return back({ platform, oauth_error: (error instanceof Error ? error.message : "Connection failed.").slice(0, 300) })
  }
}

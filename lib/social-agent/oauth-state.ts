import "server-only"
import { OAUTH_CALLBACK_PATH } from "@/lib/social-agent/connections"
import { decryptCredentials, encryptCredentials } from "@/lib/social-agent/crypto"

export const OAUTH_COOKIE = "vaap_social_oauth"
const TTL_MS = 10 * 60 * 1000

export type OAuthState = { state: string; verifier: string; platform: string; uid: string; exp: string }

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  // Lax is required so the cookie comes back on the provider's top-level redirect.
  sameSite: "lax" as const,
  path: OAUTH_CALLBACK_PATH,
  maxAge: TTL_MS / 1000,
}

export const sealState = (s: Omit<OAuthState, "exp">) => encryptCredentials({ ...s, exp: String(Date.now() + TTL_MS) })

export function openState(value: string | undefined): OAuthState | null {
  const s = value ? decryptCredentials(value) : {}
  if (!s.state || !s.platform || !s.uid || Number(s.exp) < Date.now()) return null
  return s as OAuthState
}

/** Public origin of the current request (the v0 preview and Vercel proxies rewrite Host). */
export function requestOrigin(request: Request) {
  const url = new URL(request.url)
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || url.host
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "")
  return `${proto}://${host}`
}

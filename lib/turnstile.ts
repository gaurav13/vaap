import { headers } from "next/headers"

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
export const CAPTCHA_FIELD = "cf-turnstile-response"

export function isTurnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY) && process.env.NODE_ENV !== "development"
}

const allowedHostnames = new Set(
  (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean),
)

export async function verifyTurnstile(
  token: string | null | undefined,
  expectedAction: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret || !isTurnstileEnabled()) return { ok: true }

  if (!token || token.length > 2048) {
    return { ok: false, error: "Please complete the security check before submitting." }
  }

  const h = await headers()
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined

  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.set("remoteip", ip)

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`siteverify ${res.status}`)
    const data = (await res.json()) as { success?: boolean; action?: string; hostname?: string }
    const hostnameOk = allowedHostnames.size === 0 || (!!data.hostname && allowedHostnames.has(data.hostname))
    if (data.success && data.action === expectedAction && hostnameOk) return { ok: true }
  } catch {
    // Fail closed: a verification outage must not let bots through.
  }
  return { ok: false, error: "Security check failed. Please try again." }
}

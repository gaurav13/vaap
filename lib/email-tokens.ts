import "server-only"
import crypto from "crypto"

// Signed, expiring links embedded in emails (unsubscribe, verify, resume).
// HMAC-SHA256 over the payload with BETTER_AUTH_SECRET — nothing is stored,
// and a tampered or expired token simply fails verification.

export type TokenPurpose = "unsubscribe" | "verify" | "resume"

type Payload = { p: TokenPurpose; e: string; id?: string; t?: string; x: number }

const DAY = 24 * 60 * 60 * 1000

function secret() {
  const s = process.env.BETTER_AUTH_SECRET
  if (!s) throw new Error("BETTER_AUTH_SECRET is not configured")
  return s
}

function sign(data: string) {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url")
}

export function createToken(
  purpose: TokenPurpose,
  email: string,
  opts: { id?: string | number; topic?: string; ttlDays?: number } = {},
) {
  const payload: Payload = {
    p: purpose,
    e: email.trim().toLowerCase(),
    ...(opts.id != null ? { id: String(opts.id) } : {}),
    ...(opts.topic ? { t: opts.topic } : {}),
    x: Date.now() + (opts.ttlDays ?? 7) * DAY,
  }
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${data}.${sign(data)}`
}

export function verifyToken(token: string | null | undefined, purpose: TokenPurpose) {
  if (!token || typeof token !== "string" || token.length > 2000) return null
  const [data, sig] = token.split(".")
  if (!data || !sig) return null
  const expected = Buffer.from(sign(data))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Payload
    if (payload.p !== purpose || typeof payload.e !== "string" || payload.x < Date.now()) return null
    return { email: payload.e, id: payload.id, topic: payload.t }
  } catch {
    return null
  }
}

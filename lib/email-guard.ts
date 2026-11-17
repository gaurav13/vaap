import "server-only"
import { promises as dns } from "dns"

const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

// RFC 2606 / 6761 reserved names: they can never receive mail, so any address
// on them is fake by definition.
const RESERVED_DOMAINS = new Set(["example.com", "example.org", "example.net", "example.edu"])
const RESERVED_TLDS = new Set(["test", "example", "invalid", "localhost", "local", "internal"])

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "sharklasers.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "throwawaymail.com",
  "fakeinbox.com",
  "mailnesia.com",
  "mintemail.com",
  "emailondeck.com",
  "tempr.email",
  "moakt.com",
  "spamgourmet.com",
])

const DNS_TIMEOUT_MS = 4000
const domainCache = new Map<string, { ok: boolean; at: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000

export const UNDELIVERABLE_EMAIL_MESSAGE =
  "This email address can't receive mail. Please use a real, working email address."

type Lookup<T> = { status: "found"; value: T } | { status: "missing" } | { status: "unknown" }

async function lookup<T>(promise: Promise<T>): Promise<Lookup<T>> {
  const timeout = new Promise<Lookup<T>>((resolve) => setTimeout(() => resolve({ status: "unknown" }), DNS_TIMEOUT_MS))
  const result = promise.then(
    (value): Lookup<T> => ({ status: "found", value }),
    (err: NodeJS.ErrnoException): Lookup<T> =>
      err?.code === "ENOTFOUND" || err?.code === "ENODATA" ? { status: "missing" } : { status: "unknown" },
  )
  return Promise.race([result, timeout])
}

async function domainAcceptsMail(domain: string): Promise<boolean> {
  const cached = domainCache.get(domain)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.ok

  const mx = await lookup(dns.resolveMx(domain))
  let ok: boolean
  if (mx.status === "found") {
    // A null MX ("." exchange, RFC 7505) explicitly declares the domain takes no mail.
    ok = mx.value.some((r) => r.exchange && r.exchange !== ".")
  } else if (mx.status === "missing") {
    // No MX record: RFC 5321 falls back to delivering to the A/AAAA host.
    const a = await lookup(dns.resolve4(domain))
    if (a.status === "unknown") return true
    ok = a.status === "found" && a.value.length > 0
  } else {
    // DNS timeout or server failure: fail open so real users aren't blocked by a flaky resolver.
    return true
  }
  domainCache.set(domain, { ok, at: Date.now() })
  return ok
}

/**
 * Rejects addresses that can never receive mail: malformed, reserved test
 * domains (example.org, *.test), known disposable inboxes, and domains with no
 * mail-capable DNS (e.g. made-up domains like probe-vaap.org).
 */
export async function checkDeliverableEmail(raw: unknown): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const email = String(raw ?? "").trim().toLowerCase()
  if (!EMAIL_SHAPE.test(email) || email.length > 200) {
    return { ok: false, error: "Please enter a valid email address." }
  }
  const domain = email.slice(email.lastIndexOf("@") + 1)
  const tld = domain.slice(domain.lastIndexOf(".") + 1)
  const registrable = domain.split(".").slice(-2).join(".")

  if (RESERVED_DOMAINS.has(domain) || RESERVED_DOMAINS.has(registrable) || RESERVED_TLDS.has(tld)) {
    return { ok: false, error: UNDELIVERABLE_EMAIL_MESSAGE }
  }
  if (DISPOSABLE_DOMAINS.has(domain) || DISPOSABLE_DOMAINS.has(registrable)) {
    return { ok: false, error: "Disposable email addresses aren't accepted. Please use your regular email." }
  }
  if (!(await domainAcceptsMail(domain))) {
    return { ok: false, error: UNDELIVERABLE_EMAIL_MESSAGE }
  }
  return { ok: true, email }
}

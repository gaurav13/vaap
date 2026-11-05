const DEFAULT_HOSTS = ["vaap.org.pk", "www.vaap.org.pk", "localhost:3000", "127.0.0.1:3000"]

const VERCEL_ALIAS_PATTERNS = [/^vaap-hinzas-projects\.vercel\.app$/, /^vaap-[a-z0-9-]+-hinzas-projects\.vercel\.app$/]

const PREVIEW_HOST_PATTERNS = [/\.v0\.build$/, /\.vusercontent\.net$/]

function hostOf(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).host
  } catch {
    return null
  }
}

function allowedHosts() {
  const hosts = new Set(DEFAULT_HOSTS)
  for (const value of [
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    const host = hostOf(value)
    if (host) hosts.add(host)
  }
  return hosts
}

function isAllowedHost(host: string) {
  if (allowedHosts().has(host)) return true
  if (VERCEL_ALIAS_PATTERNS.some((pattern) => pattern.test(host))) return true
  return process.env.NODE_ENV !== "production" && PREVIEW_HOST_PATTERNS.some((pattern) => pattern.test(host))
}

/**
 * True when the browser Origin is this site. Proxies (v0 preview, Vercel aliases)
 * can rewrite Host, so an Origin matching either Host header or an allowlisted
 * site domain is accepted.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return false
  let originHost = ""
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }
  const requestHosts = [request.headers.get("x-forwarded-host"), request.headers.get("host")]
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
  if (requestHosts.includes(originHost)) return true
  return isAllowedHost(originHost)
}

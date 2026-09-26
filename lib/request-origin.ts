const DEFAULT_HOSTS = ["vaap.org.pk", "www.vaap.org.pk", "localhost:3000", "127.0.0.1:3000"]

function allowedHosts() {
  const hosts = new Set(DEFAULT_HOSTS)
  const configured = process.env.BETTER_AUTH_URL?.trim()
  if (configured) {
    try {
      hosts.add(new URL(configured).host)
    } catch {
      // Ignore a malformed auth URL.
    }
  }
  return hosts
}

/** True when the browser Origin matches this request's Host and an allowlisted site. */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  if (!origin || !host) return false
  let originHost = ""
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }
  if (originHost !== host) return false
  return allowedHosts().has(originHost)
}

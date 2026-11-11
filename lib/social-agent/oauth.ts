import "server-only"
import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import type { PlatformKey } from "@/lib/social-agent/config"
import { CONNECTIONS, OAUTH_APPS, OAUTH_CALLBACK_PATH, OAUTH_PROVIDER, type OAuthProvider } from "@/lib/social-agent/connections"
import { call, form, graph, liHeaders, type Creds } from "@/lib/social-agent/publishers"
import { PUBLIC_SITE_URL } from "@/lib/site-url"

export type Destination = { id: string; name: string; detail: string; creds: Creds }
export type OAuthResult = {
  destinations: Destination[]
  grantedScopes: string[]
  expiresAt: string
  refreshExpiresAt: string
}

const GRAPH = graph({})

/** Every developer portal must register exactly this URL. Override for staging hosts with SOCIAL_OAUTH_BASE_URL. */
export function oauthCallbackUrl() {
  const base = (process.env.SOCIAL_OAUTH_BASE_URL || PUBLIC_SITE_URL).trim().replace(/\/+$/, "")
  return `${base}${OAUTH_CALLBACK_PATH}`
}

export function appCredentials(provider: OAuthProvider) {
  const spec = OAUTH_APPS[provider]
  const id = spec.idEnv.map((k) => process.env[k]?.trim()).find(Boolean)
  const secret = spec.secretEnv.map((k) => process.env[k]?.trim()).find(Boolean)
  return id && secret ? { id, secret } : null
}

export const isAppConfigured = (platform: PlatformKey) => appCredentials(OAUTH_PROVIDER[platform]) !== null

function requireApp(platform: PlatformKey) {
  const app = appCredentials(OAUTH_PROVIDER[platform])
  if (!app) throw new Error(`${OAUTH_APPS[OAUTH_PROVIDER[platform]].label} credentials are not configured on the server.`)
  return app
}

// --- PKCE and state ----------------------------------------------------------------

const b64url = (buf: Buffer) => buf.toString("base64url")
export const randomToken = () => b64url(randomBytes(32))
const challengeFor = (verifier: string) => b64url(createHash("sha256").update(verifier).digest())

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Providers whose web flow supports PKCE (S256). Meta, LinkedIn and TikTok web rely on state + client secret. */
const PKCE: Partial<Record<OAuthProvider, true>> = { x: true, google: true }

export function authorizeUrl(platform: PlatformKey, state: string, verifier: string) {
  const app = requireApp(platform)
  const provider = OAUTH_PROVIDER[platform]
  const scopes = CONNECTIONS[platform].permissions
  const redirect_uri = oauthCallbackUrl()
  const pkce: Record<string, string> = PKCE[provider] ? { code_challenge: challengeFor(verifier), code_challenge_method: "S256" } : {}
  const q = (base: string, params: Record<string, string>) => `${base}?${new URLSearchParams({ ...params, ...pkce })}`

  switch (provider) {
    case "meta":
      return q(`https://www.facebook.com/${GRAPH.split("/").pop()}/dialog/oauth`, {
        client_id: app.id,
        redirect_uri,
        state,
        response_type: "code",
        scope: scopes.join(","),
        auth_type: "rerequest",
      })
    case "linkedin":
      return q("https://www.linkedin.com/oauth/v2/authorization", { response_type: "code", client_id: app.id, redirect_uri, state, scope: scopes.join(" ") })
    case "x":
      return q("https://x.com/i/oauth2/authorize", { response_type: "code", client_id: app.id, redirect_uri, state, scope: scopes.join(" ") })
    case "google":
      return q("https://accounts.google.com/o/oauth2/v2/auth", {
        client_id: app.id,
        redirect_uri,
        state,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent select_account",
        include_granted_scopes: "true",
      })
    case "tiktok":
      return q("https://www.tiktok.com/v2/auth/authorize/", { client_key: app.id, response_type: "code", redirect_uri, state, scope: scopes.join(",") })
  }
}

// --- Code exchange and destination discovery -----------------------------------------

const inSeconds = (s?: number) => (s ? new Date(Date.now() + s * 1000).toISOString() : "")
const splitScopes = (s?: string) => (s ?? "").split(/[\s,]+/).filter(Boolean)

type MetaPage = { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }

async function exchangeMeta(platform: PlatformKey, code: string): Promise<OAuthResult> {
  const app = requireApp(platform)
  const qs = (p: Record<string, string>) => new URLSearchParams(p).toString()
  const { data: short } = await call<{ access_token: string }>(
    `${GRAPH}/oauth/access_token?${qs({ client_id: app.id, client_secret: app.secret, redirect_uri: oauthCallbackUrl(), code })}`,
  )
  // A long-lived user token makes the Page tokens below non-expiring.
  const { data: long } = await call<{ access_token: string }>(
    `${GRAPH}/oauth/access_token?${qs({ grant_type: "fb_exchange_token", client_id: app.id, client_secret: app.secret, fb_exchange_token: short.access_token })}`,
  )
  const token = encodeURIComponent(long.access_token)
  const { data: perms } = await call<{ data: { permission: string; status: string }[] }>(`${GRAPH}/me/permissions?access_token=${token}`)
  const { data: pages } = await call<{ data: MetaPage[] }>(
    `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100&access_token=${token}`,
  )
  const grantedScopes = perms.data.filter((p) => p.status === "granted").map((p) => p.permission)
  const destinations: Destination[] =
    platform === "instagram"
      ? pages.data
          .filter((p) => p.instagram_business_account?.id)
          .map((p) => ({
            id: p.instagram_business_account!.id,
            name: p.instagram_business_account!.username ? `@${p.instagram_business_account!.username}` : p.instagram_business_account!.id,
            detail: `Linked to Facebook Page ${p.name}`,
            creds: { igUserId: p.instagram_business_account!.id, accessToken: p.access_token },
          }))
      : pages.data.map((p) => ({ id: p.id, name: p.name, detail: `Page ID ${p.id}`, creds: { pageId: p.id, pageAccessToken: p.access_token } }))
  return { destinations, grantedScopes, expiresAt: "", refreshExpiresAt: "" }
}

type LinkedInToken = { access_token: string; expires_in?: number; refresh_token?: string; refresh_token_expires_in?: number; scope?: string }

async function exchangeLinkedIn(code: string): Promise<OAuthResult> {
  const app = requireApp("linkedin")
  const { data: t } = await call<LinkedInToken>("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({ grant_type: "authorization_code", code, redirect_uri: oauthCallbackUrl(), client_id: app.id, client_secret: app.secret }),
  })
  const headers = liHeaders({ accessToken: t.access_token })
  const { data: acl } = await call<{ elements?: { organization: string; role: string }[] }>(
    "https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED&count=50",
    { headers },
  )
  const orgUrns = [...new Set((acl.elements ?? []).filter((e) => e.role === "ADMINISTRATOR" || e.role === "CONTENT_ADMINISTRATOR").map((e) => e.organization))]
  const destinations = await Promise.all(
    orgUrns.slice(0, 25).map(async (urn) => {
      const id = urn.split(":").pop() ?? ""
      const { data } = await call<{ localizedName?: string }>(`https://api.linkedin.com/rest/organizations/${id}`, { headers }).catch(() => ({ data: {} as { localizedName?: string } }))
      return {
        id: urn,
        name: data.localizedName || `Organization ${id}`,
        detail: urn,
        creds: { authorUrn: urn, accessToken: t.access_token, ...(t.refresh_token ? { refreshToken: t.refresh_token } : {}) },
      }
    }),
  )
  return { destinations, grantedScopes: splitScopes(t.scope), expiresAt: inSeconds(t.expires_in), refreshExpiresAt: inSeconds(t.refresh_token_expires_in) }
}

async function exchangeX(code: string, verifier: string): Promise<OAuthResult> {
  const app = requireApp("x")
  const { data: t } = await call<{ access_token: string; refresh_token?: string; scope?: string }>("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${app.id}:${app.secret}`).toString("base64")}`,
    },
    body: form({ grant_type: "authorization_code", code, redirect_uri: oauthCallbackUrl(), code_verifier: verifier, client_id: app.id }),
  })
  if (!t.refresh_token) throw new Error("X did not return a refresh token. Make sure offline.access is enabled for the app.")
  const { data: me } = await call<{ data: { id: string; username: string; name: string } }>("https://api.x.com/2/users/me", {
    headers: { Authorization: `Bearer ${t.access_token}` },
  })
  return {
    destinations: [{ id: me.data.id, name: `@${me.data.username}`, detail: me.data.name, creds: { refreshToken: t.refresh_token } }],
    grantedScopes: splitScopes(t.scope),
    expiresAt: "",
    refreshExpiresAt: "",
  }
}

async function exchangeGoogle(code: string, verifier: string): Promise<OAuthResult> {
  const app = requireApp("youtube")
  const { data: t } = await call<{ access_token: string; refresh_token?: string; scope?: string }>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({ grant_type: "authorization_code", code, redirect_uri: oauthCallbackUrl(), client_id: app.id, client_secret: app.secret, code_verifier: verifier }),
  })
  if (!t.refresh_token) throw new Error("Google did not return a refresh token. Remove VAAP at myaccount.google.com/permissions, then reconnect.")
  const { data } = await call<{ items?: { id: string; snippet: { title: string; customUrl?: string } }[] }>(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${t.access_token}` } },
  )
  return {
    destinations: (data.items ?? []).map((c) => ({
      id: c.id,
      name: c.snippet.title,
      detail: c.snippet.customUrl ?? c.id,
      creds: { refreshToken: t.refresh_token!, channelId: c.id },
    })),
    grantedScopes: splitScopes(t.scope),
    expiresAt: "",
    refreshExpiresAt: "",
  }
}

async function exchangeTikTok(code: string): Promise<OAuthResult> {
  const app = requireApp("tiktok")
  const { data: t } = await call<{ access_token?: string; refresh_token?: string; refresh_expires_in?: number; scope?: string; open_id?: string; error_description?: string; error?: string }>(
    "https://open.tiktokapis.com/v2/oauth/token/",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form({ client_key: app.id, client_secret: app.secret, code, grant_type: "authorization_code", redirect_uri: oauthCallbackUrl() }),
    },
  )
  if (!t.access_token || !t.refresh_token) throw new Error(t.error_description || t.error || "TikTok token exchange failed")
  const { data: info } = await call<{ data?: { user?: { display_name?: string } } }>("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
    headers: { Authorization: `Bearer ${t.access_token}` },
  })
  return {
    destinations: [
      { id: t.open_id ?? "tiktok", name: info.data?.user?.display_name || "TikTok account", detail: "Account that signed in", creds: { refreshToken: t.refresh_token } },
    ],
    grantedScopes: splitScopes(t.scope),
    expiresAt: "",
    refreshExpiresAt: inSeconds(t.refresh_expires_in),
  }
}

export async function exchangeCode(platform: PlatformKey, code: string, verifier: string): Promise<OAuthResult> {
  switch (OAUTH_PROVIDER[platform]) {
    case "meta":
      return exchangeMeta(platform, code)
    case "linkedin":
      return exchangeLinkedIn(code)
    case "x":
      return exchangeX(code, verifier)
    case "google":
      return exchangeGoogle(code, verifier)
    case "tiktok":
      return exchangeTikTok(code)
  }
}

// --- Runtime credentials ----------------------------------------------------------

/** App credentials are read from the server environment at call time and never stored with account tokens. */
const APP_KEYS: Partial<Record<PlatformKey, (app: { id: string; secret: string }) => Creds>> = {
  x: (a) => ({ clientId: a.id, clientSecret: a.secret }),
  youtube: (a) => ({ clientId: a.id, clientSecret: a.secret }),
  tiktok: (a) => ({ clientKey: a.id, clientSecret: a.secret }),
}

export function withAppCredentials(platform: PlatformKey, creds: Creds): Creds {
  if (creds.authMode !== "oauth") return creds
  const inject = APP_KEYS[platform]
  return inject ? { ...creds, ...inject(requireApp(platform)) } : creds
}

export function stripAppCredentials(platform: PlatformKey, creds: Creds): Creds {
  if (creds.authMode !== "oauth") return creds
  const { clientId: _a, clientSecret: _b, clientKey: _c, ...rest } = creds
  return rest
}

const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

/** LinkedIn access tokens expire after 60 days; refresh them ahead of time when the app has refresh tokens. */
export async function ensureFresh(platform: PlatformKey, creds: Creds, save: (next: Creds) => Promise<void>): Promise<Creds> {
  if (platform !== "linkedin" || creds.authMode !== "oauth" || !creds.expiresAt) return creds
  const expires = new Date(creds.expiresAt).getTime()
  if (expires - Date.now() > REFRESH_WINDOW_MS) return creds
  if (!creds.refreshToken) {
    if (expires <= Date.now()) throw new Error("LinkedIn access has expired. Click Reconnect to authorize again.")
    return creds
  }
  const app = requireApp("linkedin")
  const { data: t } = await call<LinkedInToken>("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({ grant_type: "refresh_token", refresh_token: creds.refreshToken, client_id: app.id, client_secret: app.secret }),
  })
  const next: Creds = {
    ...creds,
    accessToken: t.access_token,
    expiresAt: inSeconds(t.expires_in),
    ...(t.refresh_token ? { refreshToken: t.refresh_token } : {}),
    ...(t.refresh_token_expires_in ? { refreshExpiresAt: inSeconds(t.refresh_token_expires_in) } : {}),
  }
  await save(next)
  return next
}

export const isExpiringSoon = (iso?: string) => !!iso && new Date(iso).getTime() - Date.now() < REFRESH_WINDOW_MS

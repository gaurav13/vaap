import "server-only"
import { and, eq, inArray, lt, lte, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { socialAccounts, socialPosts } from "@/lib/db/schema"
import { notify } from "@/lib/notifications"
import { PLATFORM_KEYS, platformLabel, type PlatformKey } from "@/lib/social-agent/config"
import { CONNECTIONS, OAUTH_PROVIDER, type ConnectionView, type OAuthView } from "@/lib/social-agent/connections"
import { decryptCredentials, encryptCredentials } from "@/lib/social-agent/crypto"
import { ensureFresh, isExpiringSoon, stripAppCredentials, withAppCredentials, type Destination, type OAuthResult } from "@/lib/social-agent/oauth"
import { PUBLISHERS, type Creds } from "@/lib/social-agent/publishers"

type AccountRow = typeof socialAccounts.$inferSelect

const isPlatform = (p: string): p is PlatformKey => PLATFORM_KEYS.includes(p as PlatformKey)
const short = (e: unknown) => (e instanceof Error ? e.message : "Unknown error").slice(0, 400)
const STATUSES = ["connected", "error", "pending"] as const

function saver(platform: PlatformKey) {
  return async (next: Creds) => {
    const [row] = await db.select({ credentials: socialAccounts.credentials }).from(socialAccounts).where(eq(socialAccounts.platform, platform)).limit(1)
    const before = row ? decryptCredentials(row.credentials) : {}
    const clean = stripAppCredentials(platform, next)
    if (clean.refreshToken !== before.refreshToken || clean.accessToken !== before.accessToken) clean.lastRefreshedAt = new Date().toISOString()
    await db.update(socialAccounts).set({ credentials: encryptCredentials(clean), updatedAt: new Date() }).where(eq(socialAccounts.platform, platform))
  }
}

/** Decrypts, refreshes if close to expiry, and adds server-held app credentials for the publisher. */
async function loadCreds(platform: PlatformKey, row: AccountRow | undefined) {
  const stored = row ? decryptCredentials(row.credentials) : {}
  const fresh = await ensureFresh(platform, stored, saver(platform))
  return withAppCredentials(platform, fresh)
}

function parsePending(creds: Creds): Destination[] {
  try {
    const list = JSON.parse(creds.pending || "[]")
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function oauthView(platform: PlatformKey, creds: Creds): OAuthView {
  const required = CONNECTIONS[platform].permissions
  const granted = (creds.grantedScopes ?? "").split(" ").filter(Boolean)
  const mode = creds.authMode === "oauth" ? "oauth" : Object.keys(creds).length ? "manual" : null
  const iso = (v?: string) => (v ? v : null)
  return {
    mode,
    grantedScopes: granted,
    // Google reports full scope URLs, others short names; match either form.
    missingScopes: mode === "oauth" ? required.filter((s) => !granted.some((g) => g === s || g.endsWith(`/${s}`))) : [],
    expiresAt: iso(creds.expiresAt),
    refreshExpiresAt: iso(creds.refreshExpiresAt),
    autoRefresh: mode === "oauth" && (OAUTH_PROVIDER[platform] !== "linkedin" || !!creds.refreshToken),
    lastRefreshedAt: iso(creds.lastRefreshedAt),
    connectedAt: iso(creds.connectedAt),
    pending: parsePending(creds).map(({ id, name, detail }) => ({ id, name, detail })),
  }
}

/** Safe-for-browser view: secrets are reduced to a masked hint. */
export function toConnectionView(row: AccountRow | undefined, platform: PlatformKey): ConnectionView {
  const creds = row ? decryptCredentials(row.credentials) : {}
  const fields = Object.fromEntries(
    CONNECTIONS[platform].fields.map((f) => {
      const v = creds[f.key]
      if (!v) return [f.key, null]
      return [f.key, f.secret ? `•••• ${v.slice(-4)}` : v]
    }),
  )
  const status = STATUSES.find((s) => s === row?.connectionStatus) ?? "not_connected"
  return {
    platform,
    handle: row?.handle ?? "",
    profileUrl: row?.profileUrl ?? "",
    notes: row?.notes ?? "",
    status,
    accountName: row?.accountName ?? "",
    lastError: row?.lastError ?? "",
    lastCheckedAt: row?.lastCheckedAt?.toISOString() ?? null,
    lastPublishedAt: row?.lastPublishedAt?.toISOString() ?? null,
    oauth: oauthView(platform, creds),
    fields,
  }
}

async function finalizeDestination(platform: PlatformKey, dest: Destination, meta: Pick<OAuthResult, "grantedScopes" | "expiresAt" | "refreshExpiresAt">, actorId: string) {
  const creds: Creds = {
    ...dest.creds,
    authMode: "oauth",
    destinationId: dest.id,
    grantedScopes: meta.grantedScopes.join(" "),
    expiresAt: meta.expiresAt,
    refreshExpiresAt: meta.refreshExpiresAt,
    connectedAt: new Date().toISOString(),
  }
  await db
    .update(socialAccounts)
    .set({ credentials: encryptCredentials(creds), connectionStatus: "not_connected", accountName: dest.name.slice(0, 120), lastError: "", updatedBy: actorId, updatedAt: new Date() })
    .where(eq(socialAccounts.platform, platform))
  return testConnection(platform)
}

/** Stores the result of an OAuth callback. One destination connects immediately; several wait for the Super Admin to choose. */
export async function completeOAuth(platform: PlatformKey, result: OAuthResult, actorId: string) {
  if (!result.destinations.length) {
    const hint: Record<PlatformKey, string> = {
      facebook: "No Facebook Pages were shared. Reconnect and select the VAAP Page in the Meta dialog.",
      instagram: "No Instagram Professional account is linked to the Pages you shared. Link it to the VAAP Page, then reconnect.",
      linkedin: "Your LinkedIn profile is not a Super admin or Content admin of any Company Page.",
      youtube: "This Google account has no YouTube channel. Pick the channel's account in Google's chooser.",
      x: "X returned no account.",
      tiktok: "TikTok returned no account.",
    }
    throw new Error(hint[platform])
  }
  await db
    .insert(socialAccounts)
    .values({ platform, updatedBy: actorId })
    .onConflictDoNothing({ target: socialAccounts.platform })
  if (result.destinations.length === 1) {
    const test = await finalizeDestination(platform, result.destinations[0], result, actorId)
    return { selected: true as const, test }
  }
  const pending: Creds = {
    authMode: "oauth",
    pending: JSON.stringify(result.destinations),
    grantedScopes: result.grantedScopes.join(" "),
    expiresAt: result.expiresAt,
    refreshExpiresAt: result.refreshExpiresAt,
  }
  await db
    .update(socialAccounts)
    .set({ credentials: encryptCredentials(pending), connectionStatus: "pending", accountName: "", lastError: "", updatedBy: actorId, updatedAt: new Date() })
    .where(eq(socialAccounts.platform, platform))
  return { selected: false as const, count: result.destinations.length }
}

export async function selectDestination(platform: PlatformKey, destinationId: string, actorId: string) {
  const [row] = await db.select().from(socialAccounts).where(eq(socialAccounts.platform, platform)).limit(1)
  const creds = row ? decryptCredentials(row.credentials) : {}
  const dest = parsePending(creds).find((d) => d.id === destinationId)
  if (!dest) throw new Error("That account is no longer available. Click Connect again.")
  return finalizeDestination(
    platform,
    dest,
    { grantedScopes: (creds.grantedScopes ?? "").split(" ").filter(Boolean), expiresAt: creds.expiresAt ?? "", refreshExpiresAt: creds.refreshExpiresAt ?? "" },
    actorId,
  )
}

/** Daily: refreshes LinkedIn tokens ahead of expiry and flags connections that need reauthorization. */
export async function refreshExpiringConnections() {
  const rows = await db.select().from(socialAccounts).where(eq(socialAccounts.connectionStatus, "connected"))
  const flagged: string[] = []
  for (const row of rows) {
    if (!isPlatform(row.platform)) continue
    const creds = decryptCredentials(row.credentials)
    if (creds.authMode !== "oauth") continue
    try {
      const fresh = await ensureFresh(row.platform, creds, saver(row.platform))
      const refreshEnds = fresh.refreshExpiresAt || (fresh.refreshToken ? "" : fresh.expiresAt)
      if (isExpiringSoon(refreshEnds)) flagged.push(`${platformLabel(row.platform)} authorization expires ${new Date(refreshEnds).toLocaleDateString("en-GB")}`)
    } catch (error) {
      await db.update(socialAccounts).set({ connectionStatus: "error", lastError: short(error), lastCheckedAt: new Date() }).where(eq(socialAccounts.platform, row.platform))
      flagged.push(`${platformLabel(row.platform)}: ${short(error)}`)
    }
  }
  if (flagged.length) {
    await notify({
      role: "admin",
      type: "alert",
      title: "Social account needs reconnecting",
      body: flagged.join(" · "),
      link: "/admin/social-agent?tab=accounts",
    }).catch(() => {})
  }
  return { checked: rows.length, flagged }
}

export async function getConnectionViews() {
  const rows = await db.select().from(socialAccounts)
  return PLATFORM_KEYS.map((p) => toConnectionView(rows.find((r) => r.platform === p), p))
}

export async function connectedPlatforms() {
  const rows = await db.select({ platform: socialAccounts.platform }).from(socialAccounts).where(eq(socialAccounts.connectionStatus, "connected"))
  return rows.map((r) => r.platform)
}

/** Merges new values into stored credentials. Blank inputs keep the existing value. */
export async function saveCredentials(platform: PlatformKey, input: Record<string, string>, actorId: string) {
  const [row] = await db.select().from(socialAccounts).where(eq(socialAccounts.platform, platform)).limit(1)
  const current = row ? decryptCredentials(row.credentials) : {}
  // Manual entry replaces any OAuth connection, so OAuth-only bookkeeping is dropped.
  const next: Creds =
    current.authMode === "oauth" ? {} : Object.fromEntries(CONNECTIONS[platform].fields.filter((f) => current[f.key]).map((f) => [f.key, current[f.key]]))
  next.authMode = "manual"
  for (const f of CONNECTIONS[platform].fields) {
    const v = (input[f.key] ?? "").trim()
    if (v) next[f.key] = v
  }
  const credentials = encryptCredentials(next)
  await db
    .insert(socialAccounts)
    .values({ platform, credentials, connectionStatus: "not_connected", updatedBy: actorId })
    .onConflictDoUpdate({ target: socialAccounts.platform, set: { credentials, updatedBy: actorId, updatedAt: new Date() } })
}

export async function testConnection(platform: PlatformKey) {
  const [row] = await db.select().from(socialAccounts).where(eq(socialAccounts.platform, platform)).limit(1)
  if (row?.connectionStatus === "pending") return { ok: false as const, error: "Choose which account to publish to first." }
  const creds = row ? decryptCredentials(row.credentials) : {}
  try {
    const accountName = await PUBLISHERS[platform].test(await loadCreds(platform, row), saver(platform))
    await db
      .update(socialAccounts)
      .set({ connectionStatus: "connected", accountName: accountName.slice(0, 120), lastError: "", lastCheckedAt: new Date() })
      .where(eq(socialAccounts.platform, platform))
    return { ok: true as const, accountName }
  } catch (error) {
    await db
      .update(socialAccounts)
      .set({ connectionStatus: Object.keys(creds).length ? "error" : "not_connected", lastError: short(error), lastCheckedAt: new Date() })
      .where(eq(socialAccounts.platform, platform))
    return { ok: false as const, error: short(error) }
  }
}

export async function disconnect(platform: PlatformKey) {
  await db
    .update(socialAccounts)
    .set({ credentials: "", connectionStatus: "not_connected", accountName: "", lastError: "", updatedAt: new Date() })
    .where(eq(socialAccounts.platform, platform))
}

const STALE_LOCK_MS = 15 * 60 * 1000

/**
 * Publishes an approved post to every selected platform that has a working connection.
 * Platforms already published are skipped, so retries never double-post.
 */
export async function publishPost(postId: number) {
  // Atomic claim so a cron run and a manual click can't publish the same post twice.
  const [post] = await db
    .update(socialPosts)
    .set({ status: "publishing", updatedAt: new Date() })
    .where(
      and(
        eq(socialPosts.id, postId),
        or(inArray(socialPosts.status, ["approved", "scheduled"]), and(eq(socialPosts.status, "publishing"), lt(socialPosts.updatedAt, new Date(Date.now() - STALE_LOCK_MS)))),
      ),
    )
    .returning()
  if (!post) throw new Error("This post is not approved or is already being published.")

  const accounts = await db.select().from(socialAccounts)
  const links = { ...post.publishedLinks }
  const errors: Record<string, string> = { ...post.publishErrors }
  const manual: string[] = []

  for (const platform of post.platforms.filter(isPlatform)) {
    if (links[platform]) continue
    const account = accounts.find((a) => a.platform === platform)
    if (account?.connectionStatus !== "connected") {
      manual.push(platform)
      continue
    }
    try {
      links[platform] = await PUBLISHERS[platform].publish(
        await loadCreds(platform, account),
        {
          caption: post.captions[platform] ?? "",
          imageUrl: post.variants[platform] || post.bannerUrl,
          videoUrl: post.videoUrl,
          title: post.sourceTitle,
          profileUrl: account.profileUrl,
        },
        saver(platform),
      )
      delete errors[platform]
      await db.update(socialAccounts).set({ lastPublishedAt: new Date(), lastError: "" }).where(eq(socialAccounts.platform, platform))
    } catch (error) {
      errors[platform] = short(error)
      await db.update(socialAccounts).set({ lastError: short(error) }).where(eq(socialAccounts.platform, platform))
    }
  }

  const done = post.platforms.every((p) => links[p])
  await db
    .update(socialPosts)
    .set({
      // Failed or manual platforms leave the post approved so it can be retried or finished by hand.
      status: done ? "published" : "approved",
      publishedAt: done ? new Date() : post.publishedAt,
      publishedLinks: links,
      publishErrors: errors,
      updatedAt: new Date(),
    })
    .where(eq(socialPosts.id, post.id))

  const failed = Object.keys(errors).filter((p) => post.platforms.includes(p))
  if (failed.length) {
    await notify({
      role: "admin",
      type: "alert",
      title: "Social post failed to publish",
      body: `${post.sourceTitle}: ${failed.map(platformLabel).join(", ")}`,
      link: `/admin/social-agent?tab=scheduled&post=${post.id}`,
    }).catch(() => {})
  }
  return { published: Object.keys(links).filter((p) => post.platforms.includes(p)), failed, manual, done }
}

/** Called by cron: publishes scheduled posts whose time has come. */
export async function publishDueScheduled() {
  const due = await db
    .select({ id: socialPosts.id })
    .from(socialPosts)
    .where(and(eq(socialPosts.status, "scheduled"), lte(socialPosts.scheduledAt, new Date())))
    .limit(10)
  const results = []
  for (const { id } of due) {
    results.push(await publishPost(id).then((r) => ({ id, ...r })).catch((e) => ({ id, error: short(e) })))
  }
  return { due: due.length, results }
}

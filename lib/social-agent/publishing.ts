import "server-only"
import { and, eq, inArray, lt, lte, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { socialAccounts, socialPosts } from "@/lib/db/schema"
import { notify } from "@/lib/notifications"
import { PLATFORM_KEYS, platformLabel, type PlatformKey } from "@/lib/social-agent/config"
import { CONNECTIONS, type ConnectionView } from "@/lib/social-agent/connections"
import { decryptCredentials, encryptCredentials } from "@/lib/social-agent/crypto"
import { PUBLISHERS, type Creds } from "@/lib/social-agent/publishers"

type AccountRow = typeof socialAccounts.$inferSelect

const isPlatform = (p: string): p is PlatformKey => PLATFORM_KEYS.includes(p as PlatformKey)
const short = (e: unknown) => (e instanceof Error ? e.message : "Unknown error").slice(0, 400)

function saver(platform: PlatformKey) {
  return async (next: Creds) => {
    await db.update(socialAccounts).set({ credentials: encryptCredentials(next), updatedAt: new Date() }).where(eq(socialAccounts.platform, platform))
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
  return {
    platform,
    handle: row?.handle ?? "",
    profileUrl: row?.profileUrl ?? "",
    notes: row?.notes ?? "",
    status: row?.connectionStatus === "connected" || row?.connectionStatus === "error" ? row.connectionStatus : "not_connected",
    accountName: row?.accountName ?? "",
    lastError: row?.lastError ?? "",
    lastCheckedAt: row?.lastCheckedAt?.toISOString() ?? null,
    fields,
  }
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
  const next: Creds = { ...current }
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
  const creds = row ? decryptCredentials(row.credentials) : {}
  try {
    const accountName = await PUBLISHERS[platform].test(creds, saver(platform))
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
        decryptCredentials(account.credentials),
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

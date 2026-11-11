import "server-only"
import type { PlatformKey } from "@/lib/social-agent/config"
import { loadImage } from "@/lib/social-agent/render"

export type Creds = Record<string, string>
export type PublishInput = { caption: string; imageUrl: string; videoUrl: string; title: string; profileUrl: string }
/** Persists rotated refresh tokens (X and TikTok issue a new one on every refresh). */
type SaveCreds = (next: Creds) => Promise<void>

type Publisher = {
  test: (c: Creds, save: SaveCreds) => Promise<string>
  publish: (c: Creds, input: PublishInput, save: SaveCreds) => Promise<string>
}

const MAX_VIDEO_BYTES = 256 * 1024 * 1024

function need(c: Creds, ...keys: string[]) {
  const missing = keys.filter((k) => !c[k]?.trim())
  if (missing.length) throw new Error(`Missing credentials: ${missing.join(", ")}`)
}

export async function call<T = Record<string, unknown>>(url: string, init: RequestInit & { timeout?: number } = {}): Promise<{ data: T; headers: Headers }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(init.timeout ?? 30000) })
  const text = await res.text()
  let data: unknown = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text.slice(0, 300) }
  }
  if (!res.ok) throw new Error(`${res.status}: ${errorText(data)}`)
  return { data: data as T, headers: res.headers }
}

function errorText(data: unknown): string {
  const d = data as Record<string, any>
  return (
    d?.error?.message ||
    d?.error_description ||
    d?.detail ||
    d?.message ||
    d?.errors?.[0]?.message ||
    (typeof d?.error === "string" ? d.error : "") ||
    d?.raw ||
    "Request failed"
  )
}

export const form = (v: Record<string, string>) => new URLSearchParams(v)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// --- Meta (Facebook + Instagram) -----------------------------------------------

export const graph = (c: Creds) => `https://graph.facebook.com/${/^v\d+\.\d+$/.test(c.graphVersion ?? "") ? c.graphVersion : "v23.0"}`

const facebook: Publisher = {
  async test(c) {
    need(c, "pageId", "pageAccessToken")
    const { data } = await call<{ name: string }>(`${graph(c)}/${encodeURIComponent(c.pageId)}?fields=name&access_token=${encodeURIComponent(c.pageAccessToken)}`)
    return data.name
  },
  async publish(c, input) {
    need(c, "pageId", "pageAccessToken")
    const { data } = await call<{ id: string; post_id?: string }>(`${graph(c)}/${encodeURIComponent(c.pageId)}/photos`, {
      method: "POST",
      body: form({ url: input.imageUrl, caption: input.caption, access_token: c.pageAccessToken }),
    })
    return `https://www.facebook.com/${data.post_id ?? data.id}`
  },
}

const instagram: Publisher = {
  async test(c) {
    need(c, "igUserId", "accessToken")
    const { data } = await call<{ username: string }>(`${graph(c)}/${encodeURIComponent(c.igUserId)}?fields=username&access_token=${encodeURIComponent(c.accessToken)}`)
    return `@${data.username}`
  },
  async publish(c, input) {
    need(c, "igUserId", "accessToken")
    const base = `${graph(c)}/${encodeURIComponent(c.igUserId)}`
    const media: Record<string, string> = input.videoUrl
      ? { media_type: "REELS", video_url: input.videoUrl }
      : { image_url: input.imageUrl }
    const { data: container } = await call<{ id: string }>(`${base}/media`, {
      method: "POST",
      body: form({ ...media, caption: input.caption, access_token: c.accessToken }),
    })
    // Containers process asynchronously (videos can take minutes).
    for (let i = 0; i < (input.videoUrl ? 40 : 10); i++) {
      const { data: s } = await call<{ status_code: string }>(`${graph(c)}/${container.id}?fields=status_code&access_token=${encodeURIComponent(c.accessToken)}`)
      if (s.status_code === "FINISHED") break
      if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error("Instagram could not process the media.")
      await sleep(input.videoUrl ? 5000 : 1500)
    }
    const { data: published } = await call<{ id: string }>(`${base}/media_publish`, {
      method: "POST",
      body: form({ creation_id: container.id, access_token: c.accessToken }),
    })
    const { data: meta } = await call<{ permalink?: string }>(`${graph(c)}/${published.id}?fields=permalink&access_token=${encodeURIComponent(c.accessToken)}`).catch(() => ({ data: {} as { permalink?: string } }))
    return meta.permalink ?? input.profileUrl ?? "https://www.instagram.com/"
  },
}

// --- LinkedIn -------------------------------------------------------------------

function linkedinVersion(c: Creds) {
  if (/^\d{6}$/.test(c.apiVersion ?? "")) return c.apiVersion
  // LinkedIn versions are YYYYMM and retire after about a year; two months back is always live.
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - 2)
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export const liHeaders = (c: Creds) => ({
  Authorization: `Bearer ${c.accessToken}`,
  "LinkedIn-Version": linkedinVersion(c),
  "X-Restli-Protocol-Version": "2.0.0",
  "Content-Type": "application/json",
})

const linkedin: Publisher = {
  async test(c) {
    need(c, "authorUrn", "accessToken")
    const org = c.authorUrn.match(/^urn:li:organization:(\d+)$/)
    if (!org) throw new Error("Organization URN must look like urn:li:organization:12345678")
    const { data } = await call<{ localizedName: string }>(`https://api.linkedin.com/rest/organizations/${org[1]}`, { headers: liHeaders(c) })
    return data.localizedName
  },
  async publish(c, input) {
    need(c, "authorUrn", "accessToken")
    const { data: init } = await call<{ value: { uploadUrl: string; image: string } }>("https://api.linkedin.com/rest/images?action=initializeUpload", {
      method: "POST",
      headers: liHeaders(c),
      body: JSON.stringify({ initializeUploadRequest: { owner: c.authorUrn } }),
    })
    const bytes = await loadImage(input.imageUrl)
    const up = await fetch(init.value.uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${c.accessToken}`, "Content-Type": "image/jpeg" },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(60000),
    })
    if (!up.ok) throw new Error(`Image upload failed (${up.status})`)
    const { headers } = await call("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: liHeaders(c),
      body: JSON.stringify({
        author: c.authorUrn,
        commentary: input.caption,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        content: { media: { id: init.value.image, altText: input.title.slice(0, 4000) } },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    })
    const urn = headers.get("x-restli-id")
    return urn ? `https://www.linkedin.com/feed/update/${urn}` : input.profileUrl || "https://www.linkedin.com/"
  },
}

// --- X ------------------------------------------------------------------------

async function xToken(c: Creds, save: SaveCreds) {
  need(c, "clientId", "refreshToken")
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" }
  if (c.clientSecret) headers.Authorization = `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}`
  const { data } = await call<{ access_token: string; refresh_token?: string }>("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers,
    body: form({ grant_type: "refresh_token", refresh_token: c.refreshToken, client_id: c.clientId }),
  })
  if (data.refresh_token && data.refresh_token !== c.refreshToken) await save({ ...c, refreshToken: data.refresh_token })
  return data.access_token
}

const x: Publisher = {
  async test(c, save) {
    const token = await xToken(c, save)
    const { data } = await call<{ data: { username: string } }>("https://api.x.com/2/users/me", { headers: { Authorization: `Bearer ${token}` } })
    return `@${data.data.username}`
  },
  async publish(c, input, save) {
    const token = await xToken(c, save)
    const body = new FormData()
    body.append("media", new Blob([new Uint8Array(await loadImage(input.imageUrl))], { type: "image/jpeg" }), "banner.jpg")
    body.append("media_category", "tweet_image")
    body.append("media_type", "image/jpeg")
    const { data: media } = await call<{ data: { id: string } }>("https://api.x.com/2/media/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      timeout: 60000,
    })
    const { data: tweet } = await call<{ data: { id: string } }>("https://api.x.com/2/tweets", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: input.caption.slice(0, 280), media: { media_ids: [media.data.id] } }),
    })
    return `https://x.com/i/web/status/${tweet.data.id}`
  },
}

// --- TikTok -------------------------------------------------------------------

async function tiktokToken(c: Creds, save: SaveCreds) {
  need(c, "clientKey", "clientSecret", "refreshToken")
  const { data } = await call<{ access_token: string; refresh_token?: string; error?: string; error_description?: string }>("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({ client_key: c.clientKey, client_secret: c.clientSecret, grant_type: "refresh_token", refresh_token: c.refreshToken }),
  })
  if (!data.access_token) throw new Error(data.error_description || data.error || "TikTok token refresh failed")
  if (data.refresh_token && data.refresh_token !== c.refreshToken) await save({ ...c, refreshToken: data.refresh_token })
  return data.access_token
}

async function tiktokCall<T>(url: string, token: string, body?: object) {
  const { data } = await call<{ data: T; error?: { code: string; message: string } }>(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (data.error && data.error.code !== "ok") throw new Error(data.error.message || data.error.code)
  return data.data
}

const PRIVACY = ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"]

const tiktok: Publisher = {
  async test(c, save) {
    const token = await tiktokToken(c, save)
    const d = await tiktokCall<{ user: { display_name: string } }>("https://open.tiktokapis.com/v2/user/info/?fields=display_name", token)
    return d.user.display_name
  },
  async publish(c, input, save) {
    const token = await tiktokToken(c, save)
    const privacy_level = PRIVACY.includes(c.privacyLevel) ? c.privacyLevel : "SELF_ONLY"
    if (input.videoUrl) {
      await tiktokCall("https://open.tiktokapis.com/v2/post/publish/video/init/", token, {
        post_info: { title: input.caption.slice(0, 2200), privacy_level },
        source_info: { source: "PULL_FROM_URL", video_url: input.videoUrl },
      })
    } else {
      await tiktokCall("https://open.tiktokapis.com/v2/post/publish/content/init/", token, {
        post_info: { title: input.title.slice(0, 90), description: input.caption.slice(0, 4000), privacy_level, auto_add_music: true },
        source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: [input.imageUrl] },
        post_mode: "DIRECT_POST",
        media_type: "PHOTO",
      })
    }
    // TikTok processes posts asynchronously and returns no public URL.
    return input.profileUrl || "https://www.tiktok.com/"
  },
}

// --- YouTube ------------------------------------------------------------------

async function googleToken(c: Creds) {
  need(c, "clientId", "clientSecret", "refreshToken")
  const { data } = await call<{ access_token: string }>("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: form({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: c.refreshToken, grant_type: "refresh_token" }),
  })
  return data.access_token
}

const youtube: Publisher = {
  async test(c) {
    const token = await googleToken(c)
    const { data } = await call<{ items?: { snippet: { title: string } }[] }>("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!data.items?.length) throw new Error("No YouTube channel found for this Google account.")
    return data.items[0].snippet.title
  },
  async publish(c, input) {
    if (!input.videoUrl) throw new Error("YouTube publishes videos only. Attach a video URL to this post.")
    const token = await googleToken(c)
    const video = await fetch(input.videoUrl, { signal: AbortSignal.timeout(120000) })
    if (!video.ok) throw new Error(`Video download failed (${video.status})`)
    const bytes = new Uint8Array(await video.arrayBuffer())
    if (bytes.byteLength > MAX_VIDEO_BYTES) throw new Error("Video is larger than 256 MB.")
    const type = video.headers.get("content-type") || "video/mp4"
    const { headers } = await call("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Upload-Content-Type": type, "X-Upload-Content-Length": String(bytes.byteLength) },
      body: JSON.stringify({
        snippet: { title: input.title.slice(0, 100), description: input.caption.slice(0, 5000) },
        status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
      }),
    })
    const location = headers.get("location")
    if (!location) throw new Error("YouTube did not return an upload URL.")
    const { data } = await call<{ id: string }>(location, { method: "PUT", headers: { "Content-Type": type }, body: bytes, timeout: 280000 })
    return `https://youtu.be/${data.id}`
  },
}

export const PUBLISHERS: Record<PlatformKey, Publisher> = { linkedin, facebook, instagram, x, tiktok, youtube }

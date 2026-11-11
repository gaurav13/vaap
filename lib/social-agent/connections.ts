// Client-safe description of what each platform needs. Values themselves live encrypted on the server.
import type { PlatformKey } from "@/lib/social-agent/config"

export type CredentialField = { key: string; label: string; secret: boolean; optional?: boolean; placeholder?: string; help?: string }

export type ConnectionSpec = {
  fields: CredentialField[]
  permissions: string[]
  requirements: string[]
  publishes: string
  portal: { label: string; url: string }
}

export const CONNECTIONS: Record<PlatformKey, ConnectionSpec> = {
  linkedin: {
    fields: [
      { key: "authorUrn", label: "Organization URN", secret: false, placeholder: "urn:li:organization:12345678", help: "From your LinkedIn Page admin URL (the number after /company/)." },
      { key: "accessToken", label: "Access token", secret: true, help: "OAuth 2.0 token from your LinkedIn developer app. Valid for 60 days." },
      { key: "apiVersion", label: "API version (YYYYMM)", secret: false, optional: true, placeholder: "Leave blank for automatic" },
    ],
    permissions: ["w_organization_social", "r_organization_social"],
    requirements: ["LinkedIn developer app verified by the VAAP Page", "Community Management API product approved"],
    publishes: "Banner image with caption to the VAAP Company Page",
    portal: { label: "LinkedIn Developer Portal", url: "https://www.linkedin.com/developers/apps" },
  },
  facebook: {
    fields: [
      { key: "pageId", label: "Page ID", secret: false, placeholder: "1234567890", help: "Facebook Page → About → Page transparency." },
      { key: "pageAccessToken", label: "Page access token", secret: true, help: "Long-lived Page token (does not expire when made from a long-lived user token)." },
      { key: "graphVersion", label: "Graph API version", secret: false, optional: true, placeholder: "v23.0" },
    ],
    permissions: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
    requirements: ["Meta developer app (Business type)", "Business verification and App Review for the permissions"],
    publishes: "Photo post with caption on the VAAP Facebook Page",
    portal: { label: "Meta for Developers", url: "https://developers.facebook.com/apps" },
  },
  instagram: {
    fields: [
      { key: "igUserId", label: "Instagram business account ID", secret: false, placeholder: "17841400000000000" },
      { key: "accessToken", label: "Access token", secret: true, help: "The Page access token of the Facebook Page linked to the Instagram account." },
      { key: "graphVersion", label: "Graph API version", secret: false, optional: true, placeholder: "v23.0" },
    ],
    permissions: ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement"],
    requirements: ["Instagram Business or Creator account linked to the Facebook Page", "Same Meta app and App Review as Facebook"],
    publishes: "Feed image (4:5) with caption, or a Reel when a video is attached",
    portal: { label: "Meta for Developers", url: "https://developers.facebook.com/apps" },
  },
  x: {
    fields: [
      { key: "clientId", label: "OAuth 2.0 client ID", secret: false },
      { key: "clientSecret", label: "OAuth 2.0 client secret", secret: true, optional: true, help: "Required for confidential (web) apps." },
      { key: "refreshToken", label: "Refresh token", secret: true, help: "Generated once with the offline.access scope. VAAP rotates it automatically." },
    ],
    permissions: ["tweet.read", "tweet.write", "users.read", "media.write", "offline.access"],
    requirements: ["X developer account and project", "X API access plan: posting may be billed. Approve the cost before connecting."],
    publishes: "Post with banner image (caption capped at 280 characters)",
    portal: { label: "X Developer Portal", url: "https://developer.x.com/en/portal/dashboard" },
  },
  tiktok: {
    fields: [
      { key: "clientKey", label: "Client key", secret: false },
      { key: "clientSecret", label: "Client secret", secret: true },
      { key: "refreshToken", label: "Refresh token", secret: true, help: "VAAP rotates it automatically." },
      { key: "privacyLevel", label: "Privacy level", secret: false, optional: true, placeholder: "SELF_ONLY", help: "Unaudited apps can only post SELF_ONLY. Use PUBLIC_TO_EVERYONE after the audit." },
    ],
    permissions: ["user.info.basic", "video.publish"],
    requirements: ["TikTok developer app with Content Posting API", "Media domain verified in the TikTok portal", "App audit before posts can be public"],
    publishes: "Photo post from the banner, or a video when a video is attached",
    portal: { label: "TikTok for Developers", url: "https://developers.tiktok.com/apps" },
  },
  youtube: {
    fields: [
      { key: "clientId", label: "Google OAuth client ID", secret: false },
      { key: "clientSecret", label: "Google OAuth client secret", secret: true },
      { key: "refreshToken", label: "Refresh token", secret: true },
    ],
    permissions: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"],
    requirements: ["Google Cloud project with YouTube Data API v3 enabled (free quota)", "OAuth app verification, otherwise uploads stay private"],
    publishes: "Videos only. Image-only posts are skipped for YouTube.",
    portal: { label: "Google Cloud Console", url: "https://console.cloud.google.com/apis/credentials" },
  },
}

export const CONNECTION_STATUS = {
  not_connected: "Not connected",
  connected: "Connected",
  error: "Needs attention",
} as const

/** What the browser is allowed to see about a stored connection. */
export type ConnectionView = {
  platform: string
  handle: string
  profileUrl: string
  notes: string
  status: keyof typeof CONNECTION_STATUS
  accountName: string
  lastError: string
  lastCheckedAt: string | null
  /** Non-secret values in full, secrets as a masked hint, missing values as null. */
  fields: Record<string, string | null>
}

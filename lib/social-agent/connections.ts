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
    permissions: ["w_organization_social", "r_organization_social", "rw_organization_admin"],
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
    permissions: ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "business_management"],
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
    permissions: ["pages_show_list", "pages_read_engagement", "business_management", "instagram_basic", "instagram_content_publish"],
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
  pending: "Choose account",
  connected: "Connected",
  error: "Needs attention",
} as const

export type OAuthProvider = "meta" | "linkedin" | "x" | "google" | "tiktok"

export const OAUTH_PROVIDER: Record<PlatformKey, OAuthProvider> = {
  facebook: "meta",
  instagram: "meta",
  linkedin: "linkedin",
  x: "x",
  youtube: "google",
  tiktok: "tiktok",
}

export const OAUTH_CALLBACK_PATH = "/api/admin/social/oauth/callback"

export type OAuthAppSpec = {
  label: string
  /** Server environment variables checked in order. The first one that is set wins. */
  idEnv: string[]
  secretEnv: string[]
  portal: { label: string; url: string }
  steps: string[]
  review: string
}

export const OAUTH_APPS: Record<OAuthProvider, OAuthAppSpec> = {
  meta: {
    label: "Meta app (Facebook and Instagram)",
    idEnv: ["META_APP_ID"],
    secretEnv: ["META_APP_SECRET"],
    portal: { label: "Meta for Developers", url: "https://developers.facebook.com/apps" },
    steps: [
      "Create a Business-type app and add the Facebook Login for Business product.",
      "Add the VAAP callback URL to Facebook Login → Settings → Valid OAuth Redirect URIs.",
      "Link the VAAP Instagram Professional account to the VAAP Facebook Page.",
      "Complete Business Verification for the VAAP business portfolio.",
    ],
    review:
      "App Review (Advanced Access) for pages_show_list, pages_read_engagement, pages_manage_posts, business_management, instagram_basic and instagram_content_publish. Until approved, only people with a role on the Meta app can connect.",
  },
  linkedin: {
    label: "LinkedIn app",
    idEnv: ["LINKEDIN_CLIENT_ID"],
    secretEnv: ["LINKEDIN_CLIENT_SECRET"],
    portal: { label: "LinkedIn Developer Portal", url: "https://www.linkedin.com/developers/apps" },
    steps: [
      "Create an app associated with the VAAP Company Page, then verify the app from the Page admin.",
      "Request the Community Management API product (it must be the only product on this app).",
      "Add the VAAP callback URL under Auth → Authorized redirect URLs.",
      "The connecting person must be a Super admin or Content admin of the VAAP Page.",
    ],
    review:
      "LinkedIn reviews Community Management API access. Tokens last 60 days. Refresh tokens are issued only to approved apps; otherwise VAAP warns you 7 days before expiry so you can reconnect.",
  },
  x: {
    label: "X app",
    idEnv: ["X_CLIENT_ID"],
    secretEnv: ["X_CLIENT_SECRET"],
    portal: { label: "X Developer Portal", url: "https://developer.x.com/en/portal/dashboard" },
    steps: [
      "Create a Project and App, then open User authentication settings.",
      "Set app permissions to Read and write, and type to Web App (confidential client).",
      "Add the VAAP callback URL and the VAAP website URL.",
      "Copy the OAuth 2.0 Client ID and Client Secret (not the API key).",
    ],
    review: "Posting requires a paid or pay-per-use X API plan. Approve that cost before connecting. No separate app review.",
  },
  google: {
    label: "Google Cloud OAuth client (YouTube)",
    idEnv: ["YOUTUBE_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    secretEnv: ["YOUTUBE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    portal: { label: "Google Cloud Console", url: "https://console.cloud.google.com/apis/credentials" },
    steps: [
      "Enable YouTube Data API v3 in the Google Cloud project (free quota).",
      "On the OAuth consent screen, add the youtube.upload and youtube.readonly scopes and publish the app (Testing mode expires refresh tokens after 7 days).",
      "Add the VAAP callback URL to the Web OAuth client's Authorized redirect URIs. The existing Google sign-in client can be reused.",
      "Sign in with the Google account that owns or manages the VAAP channel, and pick the channel in Google's account chooser.",
    ],
    review:
      "Google verification for the sensitive YouTube scopes. Unaudited projects upload videos as private only; request a YouTube API compliance audit for public uploads.",
  },
  tiktok: {
    label: "TikTok app",
    idEnv: ["TIKTOK_CLIENT_KEY"],
    secretEnv: ["TIKTOK_CLIENT_SECRET"],
    portal: { label: "TikTok for Developers", url: "https://developers.tiktok.com/apps" },
    steps: [
      "Create an app and add Login Kit and the Content Posting API with Direct Post enabled.",
      "Register the VAAP callback URL as a Login Kit redirect URI.",
      "Verify the media domain (the VAAP image CDN) under URL properties so TikTok can pull banners.",
    ],
    review: "TikTok app review for user.info.basic and video.publish. Until the Content Posting audit passes, posts are visible to the account owner only (SELF_ONLY).",
  },
}

/** Non-secret OAuth state the browser may see. */
export type OAuthView = {
  mode: "oauth" | "manual" | null
  grantedScopes: string[]
  missingScopes: string[]
  expiresAt: string | null
  refreshExpiresAt: string | null
  autoRefresh: boolean
  lastRefreshedAt: string | null
  connectedAt: string | null
  pending: { id: string; name: string; detail: string }[]
}

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
  lastPublishedAt: string | null
  oauth: OAuthView
  /** Non-secret values in full, secrets as a masked hint, missing values as null. */
  fields: Record<string, string | null>
}

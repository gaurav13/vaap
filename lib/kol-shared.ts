// Client-safe KOL constants and formatting helpers.

export const KOL_STATUSES = [
  "not_applied",
  "draft",
  "pending",
  "under_review",
  "info_required",
  "verified",
  "rejected",
  "expired",
  "revoked",
] as const
export type KolStatus = (typeof KOL_STATUSES)[number]

export const KOL_STATUS_LABEL: Record<KolStatus, string> = {
  not_applied: "Not Applied",
  draft: "Draft",
  pending: "Application Pending",
  under_review: "Under Review",
  info_required: "Additional Information Required",
  verified: "Verified",
  rejected: "Rejected",
  expired: "Verification Expired",
  revoked: "Revoked",
}

export const KOL_STATUS_TONE: Record<KolStatus, string> = {
  not_applied: "bg-surface text-muted-2",
  draft: "bg-surface text-body",
  pending: "bg-blue-tint text-navy",
  under_review: "bg-blue-tint text-navy",
  info_required: "bg-gold-tint text-heading",
  verified: "bg-mint text-green",
  rejected: "bg-destructive/10 text-destructive",
  expired: "bg-gold-tint text-heading",
  revoked: "bg-destructive/10 text-destructive",
}

// Statuses in which the member may edit and (re)submit the application.
export const KOL_EDITABLE: KolStatus[] = ["draft", "info_required", "rejected", "expired"]

export const KOL_EXPERTISE = [
  "Fintech",
  "Blockchain",
  "Web3",
  "Crypto",
  "Technology",
  "Digital Payments",
  "Regulation & Policy",
  "DeFi",
  "NFTs & Digital Art",
  "Education",
  "Investment & Trading",
  "Media & Journalism",
] as const

export const KOL_PLATFORMS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X (Twitter)" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "telegram", label: "Telegram" },
  { value: "other", label: "Other" },
] as const

export function platformLabel(value: string) {
  return KOL_PLATFORMS.find((p) => p.value === value)?.label ?? value
}

export const AUDIENCE_BANDS = [
  { value: "0-10k", label: "Under 10K", min: 0, max: 10_000 },
  { value: "10k-50k", label: "10K – 50K", min: 10_000, max: 50_000 },
  { value: "50k-250k", label: "50K – 250K", min: 50_000, max: 250_000 },
  { value: "250k+", label: "250K+", min: 250_000, max: Number.POSITIVE_INFINITY },
] as const

export const KOL_VALIDITY_DAYS = 365

export function sumFollowers(platforms: { followers?: number | string | null }[] | null | undefined) {
  return Math.round((platforms ?? []).reduce((sum, p) => sum + (Number(p.followers) || 0), 0))
}

export function formatCount(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}K`
  return String(Math.round(n))
}

export function formatDate(d: Date | string | null | undefined) {
  return d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"
}

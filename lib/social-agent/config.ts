// Client-safe definitions shared by the AI Social Media Agent server code and UI.

export const PLATFORMS = [
  { key: "linkedin", label: "LinkedIn", width: 1200, height: 627, captionLimit: 3000 },
  { key: "facebook", label: "Facebook", width: 1200, height: 630, captionLimit: 5000 },
  { key: "instagram", label: "Instagram", width: 1080, height: 1350, captionLimit: 2200 },
  { key: "x", label: "X", width: 1600, height: 900, captionLimit: 280 },
  { key: "tiktok", label: "TikTok", width: 1080, height: 1920, captionLimit: 2200, needsVideo: true },
  { key: "youtube", label: "YouTube", width: 1280, height: 720, captionLimit: 5000, needsVideo: true },
] as const

export type PlatformKey = (typeof PLATFORMS)[number]["key"]
export const PLATFORM_KEYS = PLATFORMS.map((p) => p.key) as PlatformKey[]
export const platformLabel = (k: string) => PLATFORMS.find((p) => p.key === k)?.label ?? k

export type FieldKind = "text" | "image"
export type CategoryField = { key: string; label: string; kind: FieldKind; sample: string }

const SITE_FIELD: CategoryField = { key: "website", label: "Website", kind: "text", sample: "vaap.org.pk" }

export const CATEGORIES = [
  {
    key: "team",
    label: "Team Announcements",
    source: "Leadership profiles (Chairman, Vice Chairmen, Executive Committee)",
    fields: [
      { key: "photo", label: "Profile photograph", kind: "image", sample: "" },
      { key: "name", label: "Name", kind: "text", sample: "Full Name" },
      { key: "position", label: "VAAP position", kind: "text", sample: "Executive Committee" },
      { key: "title", label: "Professional title", kind: "text", sample: "Chief Executive Officer" },
      { key: "organization", label: "Organization", kind: "text", sample: "Organization Name" },
      SITE_FIELD,
    ],
  },
  {
    key: "advisory",
    label: "Advisory Board",
    source: "Leadership profiles of type Advisory Committee Members",
    fields: [
      { key: "photo", label: "Profile photograph", kind: "image", sample: "" },
      { key: "name", label: "Name", kind: "text", sample: "Full Name" },
      { key: "position", label: "VAAP position", kind: "text", sample: "Advisory Board Member" },
      { key: "title", label: "Professional title", kind: "text", sample: "Senior Advisor" },
      { key: "organization", label: "Organization", kind: "text", sample: "Organization Name" },
      SITE_FIELD,
    ],
  },
  {
    key: "kol",
    label: "Verified KOLs",
    source: "KOL profiles with Verified status",
    fields: [
      { key: "photo", label: "Approved photograph", kind: "image", sample: "" },
      { key: "name", label: "Verified name", kind: "text", sample: "Verified Name" },
      { key: "designation", label: "Designation", kind: "text", sample: "Blockchain Educator" },
      { key: "handles", label: "Social media handles", kind: "text", sample: "X · YouTube · LinkedIn" },
      { key: "stats", label: "Verified statistics", kind: "text", sample: "250K followers · 1.2M monthly reach" },
      SITE_FIELD,
    ],
  },
  {
    key: "partners",
    label: "Partners and Partnerships",
    source: "Published partners",
    fields: [
      { key: "logo", label: "Partner logo", kind: "image", sample: "" },
      { key: "name", label: "Partner name", kind: "text", sample: "Partner Organization" },
      { key: "headline", label: "Headline", kind: "text", sample: "Welcome to the VAAP partner network" },
      SITE_FIELD,
    ],
  },
  {
    key: "news",
    label: "News and Media Coverage",
    source: "Published news and media coverage",
    fields: [
      { key: "publisherLogo", label: "Publisher logo", kind: "image", sample: "" },
      { key: "image", label: "News featured image", kind: "image", sample: "" },
      { key: "headline", label: "News headline", kind: "text", sample: "Dynamic News Headline" },
      { key: "summary", label: "Short summary", kind: "text", sample: "Short summary extracted from the approved article" },
      { key: "date", label: "Publication date", kind: "text", sample: "12 Nov 2026" },
      { key: "publisher", label: "Publisher name", kind: "text", sample: "Publisher" },
      SITE_FIELD,
    ],
  },
  {
    key: "articles",
    label: "Articles and Opinion Pieces",
    source: "Published articles",
    fields: [
      { key: "image", label: "Featured image", kind: "image", sample: "" },
      { key: "headline", label: "Article title", kind: "text", sample: "Article Title" },
      { key: "summary", label: "Excerpt", kind: "text", sample: "Short excerpt of the article" },
      { key: "author", label: "Author", kind: "text", sample: "Author Name" },
      { key: "date", label: "Publication date", kind: "text", sample: "12 Nov 2026" },
      SITE_FIELD,
    ],
  },
  {
    key: "events",
    label: "Events",
    source: "Published and approved events",
    fields: [
      { key: "image", label: "Event cover image", kind: "image", sample: "" },
      { key: "headline", label: "Event title", kind: "text", sample: "Event Title" },
      { key: "date", label: "Date and time", kind: "text", sample: "12 Nov 2026 · 6:00 PM" },
      { key: "location", label: "Location", kind: "text", sample: "Karachi" },
      { key: "host", label: "Host", kind: "text", sample: "VAAP" },
      SITE_FIELD,
    ],
  },
  {
    key: "membership",
    label: "Membership Announcements",
    source: "Active members",
    fields: [
      { key: "name", label: "Member name", kind: "text", sample: "Member Name" },
      { key: "designation", label: "Designation", kind: "text", sample: "Founder" },
      { key: "organization", label: "Organization", kind: "text", sample: "Organization Name" },
      { key: "memberCategory", label: "Membership category", kind: "text", sample: "Verified Community Members" },
      SITE_FIELD,
    ],
  },
] as const satisfies readonly { key: string; label: string; source: string; fields: readonly CategoryField[] }[]

export type CategoryKey = (typeof CATEGORIES)[number]["key"]
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as CategoryKey[]
export const isCategoryKey = (v: unknown): v is CategoryKey => CATEGORY_KEYS.includes(v as CategoryKey)
export const getCategory = (k: string) => CATEGORIES.find((c) => c.key === k)
export const categoryLabel = (k: string) => getCategory(k)?.label ?? k

/** One editable area on a banner. Coordinates are fractions (0–1) of the banner so they survive image replacement. */
export type TemplateLayer = {
  id: string
  field: string
  kind: FieldKind
  x: number
  y: number
  w: number
  h: number
  /** Pixels at the banner's native size. */
  fontSize: number
  weight: "normal" | "bold"
  color: string
  align: "left" | "center" | "right"
  maxLines: number
  maxChars: number
  uppercase: boolean
  /** preserve = whole image on white padding, never cropped (newspaper clippings). */
  fit: "cover" | "contain" | "preserve"
  shape: "rect" | "circle"
}

/** Per-post manual placement for one image area. zoom 1–3, x/y pan from -1 to 1. */
export type ImageAdjust = { fit: "auto" | "preserve" | "fill"; zoom: number; x: number; y: number }
export const DEFAULT_ADJUST: ImageAdjust = { fit: "auto", zoom: 1, x: 0, y: 0 }

/** Image areas that must show the whole source (newspaper and article clippings). */
export const preservesWholeImage = (category: string, field: string) => (category === "news" || category === "articles") && field === "image"

export const POST_STATUSES = {
  needs_review: "Needs review",
  pending_approval: "Awaiting approval",
  approved: "Approved",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  rejected: "Rejected",
} as const
export type PostStatus = keyof typeof POST_STATUSES

export type CategoryRules = {
  enabled: boolean
  autoGenerate: boolean
  captionRules: string
  hashtags: string
  platforms: PlatformKey[]
}

export const DEFAULT_RULES: CategoryRules = {
  enabled: true,
  autoGenerate: false,
  captionRules: "",
  hashtags: "#VAAP #Pakistan #VirtualAssets",
  platforms: ["linkedin", "facebook", "instagram", "x"],
}

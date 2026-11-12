// Shared (client + server) leadership helpers: sections, clean URLs and the
// profile template fields used by the application form, AI studio and site.

export const LEADERSHIP_SECTIONS = [
  { slug: "office-bearers", label: "Office Bearers", kinds: ["Chairman", "Sr. Vice Chairman", "Vice Chairman"] },
  { slug: "executive-committee", label: "Executive Committee", kinds: ["Executive Committee"] },
  { slug: "advisory-board", label: "Advisory Board", kinds: ["Advisory Committee Members", "Advisory Board Members"] },
  { slug: "industry-advisors", label: "Industry Advisors", kinds: ["Industry Advisor Members"] },
] as const

export type LeadershipSectionSlug = (typeof LEADERSHIP_SECTIONS)[number]["slug"]

/** Positions people can apply for (office bearers are appointed, not applied for). */
export const APPLICATION_KINDS = [
  { value: "Executive Committee", label: "Executive Committee" },
  { value: "Advisory Committee Members", label: "Advisory Board" },
  { value: "Industry Advisor Members", label: "Industry Advisor" },
] as const

export function sectionForKind(kind: string | null | undefined): (typeof LEADERSHIP_SECTIONS)[number] {
  return LEADERSHIP_SECTIONS.find((s) => (s.kinds as readonly string[]).includes(kind ?? "")) ?? LEADERSHIP_SECTIONS[1]
}

export function findSection(slug: string) {
  return LEADERSHIP_SECTIONS.find((s) => s.slug === slug) ?? null
}

export function slugifyName(input: string) {
  return (
    input
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "profile"
  )
}

/** Canonical public URL, e.g. /leadership/advisory-board/full-name. Falls back to the legacy id URL. */
export function leaderPath(p: { id: number; slug?: string | null; kind?: string | null }) {
  if (!p.slug) return `/team/${p.id}`
  return `/leadership/${sectionForKind(p.kind).slug}/${p.slug}`
}

/** Every editable field of the Leadership Profile template, in display order. */
export const PROFILE_FIELDS = [
  "name",
  "kind",
  "position",
  "title",
  "organization",
  "responsibility",
  "portfolio",
  "summary",
  "bio",
  "message",
  "photo",
  "linkedin",
  "x",
  "facebook",
  "instagram",
  "website",
  "email",
] as const

export type ProfileField = (typeof PROFILE_FIELDS)[number]
export type ProfileContent = Record<ProfileField, string>

/** Sections the AI may write. Everything else is copied from the applicant or the admin. */
export const AI_SECTIONS = [
  { key: "summary", label: "Profile summary" },
  { key: "bio", label: "Professional biography" },
  { key: "responsibility", label: "Responsibilities" },
  { key: "message", label: "Message to the community" },
] as const

export type AiSection = (typeof AI_SECTIONS)[number]["key"]

export const LEADERSHIP_STATUSES = ["pending", "in_review", "approved", "rejected"] as const
export type LeadershipStatus = (typeof LEADERSHIP_STATUSES)[number]

export const STATUS_LABELS: Record<string, string> = {
  pending: "New application",
  in_review: "In review",
  approved: "Published",
  rejected: "Rejected",
}

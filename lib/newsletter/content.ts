// Shared by the admin composer (client) and the renderer/actions (server).

export type BlockAlign = "left" | "center" | "right"

export type ContentBlock =
  | { id: string; type: "text"; html: string }
  | { id: string; type: "heading"; text: string; level: 2 | 3; align: BlockAlign }
  | { id: string; type: "image"; url: string; alt: string; href: string }
  | { id: string; type: "button"; label: string; url: string; color: string; align: BlockAlign }
  | { id: string; type: "divider" }

export type CampaignContent = {
  title: string
  subject: string
  previewText: string
  subheading: string
  bannerUrl: string
  bodyHtml: string
  blocks: ContentBlock[]
  ctaLabel: string
  ctaUrl: string
  ctaColor: string
  footerHtml: string
}

export const AUDIENCE_GROUPS = [
  { value: "all", label: "All Contacts", hint: "Every eligible member and subscribed non-member." },
  { value: "paid", label: "Paid Members", hint: "Membership payment verified." },
  { value: "unpaid", label: "Unpaid Members", hint: "Registered but payment not completed." },
  { value: "pending", label: "Pending Members", hint: "Application awaiting approval." },
  { value: "approved", label: "Approved Members", hint: "Application approved." },
  { value: "rejected", label: "Rejected Members", hint: "Application rejected. Promotional emails need marketing consent." },
  { value: "non-members", label: "Non-Members", hint: "Subscribers and registered accounts without a membership." },
] as const

export type AudienceGroup = (typeof AUDIENCE_GROUPS)[number]["value"]

export type AudienceSelection = {
  groups: AudienceGroup[]
  /** Limit member groups to these membership plans (empty = all plans). */
  plans: string[]
  /** Custom selection: individual addresses added on top of the groups. */
  include: string[]
  /** Addresses that must never receive this email. */
  exclude: string[]
}

export const BRAND_COLORS = [
  { label: "VAAP green", value: "#247049" },
  { label: "Deep teal", value: "#00343a" },
  { label: "Ink", value: "#102a36" },
  { label: "Slate", value: "#425466" },
  { label: "Gold", value: "#b7791f" },
] as const

export const DEFAULT_CTA_COLOR = BRAND_COLORS[0].value

export const EMPTY_CONTENT: CampaignContent = {
  title: "",
  subject: "",
  previewText: "",
  subheading: "",
  bannerUrl: "",
  bodyHtml: "",
  blocks: [],
  ctaLabel: "",
  ctaUrl: "",
  ctaColor: DEFAULT_CTA_COLOR,
  footerHtml: "",
}

export const EMPTY_AUDIENCE: AudienceSelection = { groups: [], plans: [], include: [], exclude: [] }

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const HEX_RE = /^#[0-9a-f]{6}$/i

export function groupLabel(g: string) {
  return AUDIENCE_GROUPS.find((x) => x.value === g)?.label ?? g
}

export function describeSelection(a: AudienceSelection) {
  const parts: string[] = a.groups.map(groupLabel)
  if (a.include.length) parts.push(`${a.include.length} added manually`)
  let label = parts.length ? parts.join(" + ") : "No audience selected"
  if (a.plans.length) label += ` (plans: ${a.plans.join(", ")})`
  if (a.exclude.length) label += ` · ${a.exclude.length} excluded`
  return label
}

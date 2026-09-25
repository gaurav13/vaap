import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"

// Typed shapes for the JSON blobs stored in the settings key-value table.
export type MenuItem = { label: string; href: string; newTab?: boolean; children?: MenuItem[] }
export type SocialLinks = {
  linkedin: string
  x: string
  youtube: string
  instagram: string
  facebook: string
}
export type General = {
  siteTitle: string
  tagline: string
  footerText: string
  copyright: string
}
export type Banner = {
  enabled: boolean
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
}
export type NewsAlertColor =
  | "green"
  | "mint"
  | "blue"
  | "sand"
  | "rose"
  | "charcoal"
  | "slate"
  | "violet"
export type NewsAlert = {
  enabled: boolean
  message: string
  linkLabel: string
  linkHref: string
  dismissible: boolean
  color: NewsAlertColor
}
export type GovHero = {
  eyebrow: string
  headingLine1: string
  headingLine2: string
  headingHighlight: string
  description: string
  ctaLabel: string
  ctaHref: string
  trust1: string
  trust2: string
  trust3: string
  statement: string
  showStatement: boolean
  desktopImage: string
  mobileImage: string
  desktopPosition: string
  mobilePosition: string
  imageAlt: string
  overlay: number
}

export type GovFramework = {
  eyebrow: string
  heading: string
  description: string
  govName: string
  govDescription: string
  govLogo: string
  mofName: string
  mofDescription: string
  mofLogo: string
  pvaraName: string
  pvaraFullName: string
  pvaraRole: string
  pvaraDescription: string
  pvaraLogo: string
  vaapLogo: string
  vaapBadge: string
  vaapEyebrow: string
  vaapName: string
  vaapRole: string
  vaapSupporting: string
  vaapVerified: boolean
  vaapVerifiedRole: string
  industryTitle: string
  industryDescription: string
  industryLogo: string
  clarificationLead: string
  clarificationEmphasis: string
  clarificationVerifiedEmphasis: string
}

export type MembershipContentFont = "sans" | "serif"
export type MembershipContentSize = "sm" | "base" | "lg"

export type Membership = {
  eyebrow: string
  heading: string
  description: string
  statement: string
  showStatement: boolean
  contentFont: MembershipContentFont
  contentSize: MembershipContentSize
  eligibilityFont: MembershipContentFont
  eligibilitySize: MembershipContentSize
  faqEyebrow: string
  faqHeading: string
  faqDescription: string
  faqCtaLabel: string
  faqCtaHref: string
}

export type Footer = {
  tagline: string
  description: string
  quickLinksHeading: string
  quickLinks: MenuItem[]
  resourcesHeading: string
  resources: MenuItem[]
  newsletterHeading: string
  newsletterText: string
  newsletterCta: string
  privacyNote: string
  brandTagline: string
  legal: MenuItem[]
}

export type SiteStatus = {
  // When true, public visitors see the "Launching Soon" page instead of the
  // live site. Staff/admins always bypass this so they can keep working.
  comingSoon: boolean
}

export type CtaBanner = {
  enabled: boolean
  eyebrow: string
  headingLine1: string
  headingHighlight: string
  description: string
  bannerHref: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
  feature1: string
  feature2: string
  feature3: string
  feature4: string
  sideLine: string
  sideStatement: string
  tagline: string
  image: string
  imageAlt: string
}

// The public "Voting" mega-menu. Kept as a single source of truth so the site
// header, the sitemap and the super-admin menu editor all stay in sync. It is
// injected automatically by ensureVotingMenu() whenever it is not already
// present, so admins never have to add it by hand.
export const VOTING_MENU: MenuItem = {
  label: "Voting",
  href: "/governance/voting/active",
  children: [
    { label: "Active Votes", href: "/governance/voting/active" },
    { label: "Upcoming Votes", href: "/governance/voting/upcoming" },
    { label: "Voting Results", href: "/governance/voting/results" },
    { label: "Voting Guidelines", href: "/governance/voting/guidelines" },
  ],
}

// Ensure the Voting menu is present exactly once, positioned right after the
// Governance item (or appended if Governance is absent). Idempotent: it detects
// an existing Voting entry by label or by a /governance/voting href.
export function ensureVotingMenu(items: MenuItem[]): MenuItem[] {
  const hasVoting = items.some(
    (i) => i.label?.trim().toLowerCase() === "voting" || (i.href ?? "").startsWith("/governance/voting"),
  )
  if (hasVoting) return items
  const idx = items.findIndex((i) => i.label?.trim().toLowerCase() === "governance")
  const next = [...items]
  next.splice(idx >= 0 ? idx + 1 : next.length, 0, VOTING_MENU)
  return next
}

export const DEFAULT_MENU: MenuItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Team", href: "/team" },
  { label: "Governance", href: "/governance" },
  VOTING_MENU,
  { label: "Committees", href: "/committees" },
  {
    label: "Membership",
    href: "/membership",
    children: [{ label: "Apply for Membership", href: "/membership/apply" }],
  },
  { label: "Ecosystem", href: "/ecosystem" },
  { label: "Knowledge", href: "/knowledge" },
  { label: "Media & Events", href: "/events" },
  { label: "Community", href: "/community" },
  { label: "Contact", href: "/contact" },
]

export const DEFAULT_SOCIAL: SocialLinks = {
  linkedin: "",
  x: "",
  youtube: "",
  instagram: "",
  facebook: "",
}

export const DEFAULT_GENERAL: General = {
  siteTitle: "Virtual Assets Association of Pakistan",
  tagline: "Building a responsible, innovative and connected virtual asset ecosystem for Pakistan.",
  footerText: "Building a responsible, innovative and connected virtual asset ecosystem for Pakistan.",
  copyright: "© 2026 VAAP. All rights reserved.",
}

export const DEFAULT_BANNER: Banner = {
  enabled: true,
  title: "Be Part of a Stronger Digital Pakistan",
  subtitle: "Access exclusive opportunities, events and resources.",
  ctaLabel: "Explore Opportunities",
  ctaHref: "/opportunities",
}

export const DEFAULT_NEWS_ALERT: NewsAlert = {
  enabled: true,
  message: "VAAP is now open for founding memberships — help shape Pakistan's virtual asset industry.",
  linkLabel: "Learn more",
  linkHref: "/membership",
  dismissible: true,
  color: "green",
  }

export const DEFAULT_GOV_HERO: GovHero = {
  eyebrow: "Governance",
  headingLine1: "A Stronger Framework",
  headingLine2: "for a Responsible",
  headingHighlight: "Digital Pakistan",
  description:
    "VAAP promotes transparent industry representation, responsible collaboration and effective participation across Pakistan's evolving virtual asset ecosystem.",
  ctaLabel: "Join VAAP",
  ctaHref: "/membership",
  trust1: "Transparency",
  trust2: "Industry Representation",
  trust3: "Responsible Growth",
  statement: "People.\nIndustry.\nInnovation.\nA stronger\nPakistan.",
  showStatement: true,
  desktopImage: "/images/hero-islamabad.png",
  mobileImage: "/images/hero-islamabad.png",
  desktopPosition: "center",
  mobilePosition: "70% center",
  imageAlt: "Faisal Mosque and the mountains of Islamabad, Pakistan",
  overlay: 100,
}

export const DEFAULT_GOV_FRAMEWORK: GovFramework = {
  eyebrow: "National Framework",
  heading: "Understanding Pakistan's Virtual Asset Ecosystem",
  description:
    "Pakistan's virtual asset ecosystem brings together government, regulators and industry — each with a distinct role.",
  govName: "Government of Pakistan",
  govDescription: "National Direction",
  govLogo: "/pakistan-emblem.webp",
  mofName: "Ministry of Finance",
  mofDescription: "Policy & Economic Coordination",
  mofLogo: "",
  pvaraName: "PVARA",
  pvaraFullName: "Pakistan Virtual Assets Regulatory Authority",
  pvaraRole: "Regulatory Authority",
  pvaraDescription: "Regulation, Licensing & Supervision",
  pvaraLogo: "",
  vaapLogo: "",
  vaapBadge: "Industry Representative",
  vaapEyebrow: "National Industry Representative",
  vaapName: "Virtual Assets Association of Pakistan",
  vaapRole: "National Industry Representation",
  vaapSupporting: "Representing Pakistan's Virtual Asset Industry",
  vaapVerified: false,
  vaapVerifiedRole: "Single National Industry Representative",
  industryTitle: "Industry & Community",
  industryDescription: "Companies • Startups • Professionals & Users",
  industryLogo: "",
  clarificationLead: "PVARA regulates and supervises the virtual asset sector.",
  clarificationEmphasis:
    "VAAP represents the industry's collective voice and organizes industry participation at the national level.",
  clarificationVerifiedEmphasis:
    "VAAP serves as the recognized national industry representative for Pakistan's virtual asset sector.",
}

export const DEFAULT_MEMBERSHIP: Membership = {
  eyebrow: "Membership",
  heading: "Join the National Industry Platform",
  description: "Be part of a transparent, collaborative and forward-looking digital asset ecosystem in Pakistan.",
  statement: "People.\nPolicy.\nInnovation.\nA Stronger\nPakistan.",
  showStatement: true,
  contentFont: "sans",
  contentSize: "base",
  eligibilityFont: "sans",
  eligibilitySize: "sm",
  faqEyebrow: "Frequently Asked Questions",
  faqHeading: "Your Questions, Answered",
  faqDescription: "Find quick answers to common questions about membership and voting.",
  faqCtaLabel: "View All FAQs",
  faqCtaHref: "/contact",
}

export const DEFAULT_FOOTER: Footer = {
  tagline: "A Stronger Digital Pakistan",
  description: "Building a responsible, innovative and inclusive virtual asset ecosystem for Pakistan.",
  quickLinksHeading: "Quick Links",
  quickLinks: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Governance", href: "/governance" },
    { label: "Membership", href: "/membership" },
    { label: "Ecosystem", href: "/ecosystem" },
    { label: "News & Events", href: "/events" },
    { label: "Resources", href: "/knowledge" },
    { label: "Contact", href: "/contact" },
  ],
  resourcesHeading: "Useful Resources",
  resources: [
    { label: "Reports & Publications", href: "/knowledge" },
    { label: "Policies & Position Papers", href: "/knowledge" },
    { label: "Industry Guidelines", href: "/knowledge" },
    { label: "Research & Insights", href: "/knowledge" },
    { label: "Media Kit", href: "/knowledge" },
    { label: "FAQs", href: "/contact" },
  ],
  newsletterHeading: "Stay Updated",
  newsletterText: "Subscribe to our newsletter for the latest updates on Pakistan's virtual asset ecosystem.",
  newsletterCta: "Subscribe",
  privacyNote: "We respect your privacy. No spam, ever.",
  brandTagline: "People • Policy • Progress",
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Use", href: "#" },
    { label: "Disclaimer", href: "#" },
    { label: "Membership Policy", href: "#" },
    { label: "Sitemap", href: "/sitemap" },
  ],
}

export const DEFAULT_CTA_BANNER: CtaBanner = {
  enabled: true,
  eyebrow: "Become a VAAP Member",
  headingLine1: "Join Pakistan's Virtual Asset",
  headingHighlight: "Industry Community",
  description:
    "Connect. Collaborate. Contribute to a stronger, more innovative and inclusive digital Pakistan.",
  bannerHref: "/membership",
  primaryLabel: "Apply for Membership",
  primaryHref: "/membership/apply",
  secondaryLabel: "Explore Membership Types",
  secondaryHref: "/membership",
  feature1: "Grow Your Network",
  feature2: "Access Opportunities",
  feature3: "Be Part of a Stronger Ecosystem",
  feature4: "Shape Pakistan's Digital Future",
  sideLine: "People • Policy • Progress",
  sideStatement: "A Stronger Digital Pakistan",
  tagline: "Simple Application • Secure Verification • Transparent Process",
  image: "/images/cta-membership.png",
  imageAlt: "Faisal Mosque, the Margalla mountains and the Pakistan flag at sunrise",
}

export const DEFAULT_SITE_STATUS: SiteStatus = {
  comingSoon: false,
}

export type RewardPayout = {
  // Referral rewards accumulate per referrer while "collecting". Only once a
  // referrer's collected total reaches this threshold do their rewards become
  // eligible for review & payout. Set to 0 to make every reward eligible
  // immediately (no accumulation).
  threshold: number
  currency: string
}

export const DEFAULT_REWARD_PAYOUT: RewardPayout = {
  threshold: 30000,
  currency: "PKR",
}

export const SETTING_KEYS = ["menu", "social", "general", "banner", "newsAlert", "govHero", "govFramework", "membership", "footer", "ctaBanner", "siteStatus", "rewardPayout"] as const
export type SettingKey = (typeof SETTING_KEYS)[number]

function parse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") {
      // Merge objects so newly-added fields keep their defaults.
      if (!Array.isArray(parsed) && !Array.isArray(fallback)) {
        return { ...(fallback as object), ...(parsed as object) } as T
      }
      return parsed as T
    }
    return fallback
  } catch {
    return fallback
  }
}

async function readAll(): Promise<Record<string, string>> {
  try {
    const rows = await db.select().from(settings)
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  } catch {
    return {}
  }
}

export type SiteSettings = {
  menu: MenuItem[]
  social: SocialLinks
  general: General
  banner: Banner
  newsAlert: NewsAlert
  govHero: GovHero
  govFramework: GovFramework
  membership: Membership
  footer: Footer
  ctaBanner: CtaBanner
  siteStatus: SiteStatus
  rewardPayout: RewardPayout
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const map = await readAll()
  return {
    menu: ensureVotingMenu(parse<MenuItem[]>(map.menu, DEFAULT_MENU)),
    social: parse<SocialLinks>(map.social, DEFAULT_SOCIAL),
    general: parse<General>(map.general, DEFAULT_GENERAL),
    banner: parse<Banner>(map.banner, DEFAULT_BANNER),
    newsAlert: parse<NewsAlert>(map.newsAlert, DEFAULT_NEWS_ALERT),
    govHero: parse<GovHero>(map.govHero, DEFAULT_GOV_HERO),
    govFramework: parse<GovFramework>(map.govFramework, DEFAULT_GOV_FRAMEWORK),
    membership: parse<Membership>(map.membership, DEFAULT_MEMBERSHIP),
    footer: parse<Footer>(map.footer, DEFAULT_FOOTER),
    ctaBanner: parse<CtaBanner>(map.ctaBanner, DEFAULT_CTA_BANNER),
    siteStatus: parse<SiteStatus>(map.siteStatus, DEFAULT_SITE_STATUS),
    rewardPayout: parse<RewardPayout>(map.rewardPayout, DEFAULT_REWARD_PAYOUT),
  }
}

export async function getRewardPayout(): Promise<RewardPayout> {
  const map = await readAll()
  return parse<RewardPayout>(map.rewardPayout, DEFAULT_REWARD_PAYOUT)
}

export async function getSiteStatus(): Promise<SiteStatus> {
  const map = await readAll()
  return parse<SiteStatus>(map.siteStatus, DEFAULT_SITE_STATUS)
}

export async function getNewsAlert(): Promise<NewsAlert> {
  const map = await readAll()
  return parse<NewsAlert>(map.newsAlert, DEFAULT_NEWS_ALERT)
}

export async function getFooter(): Promise<Footer> {
  const map = await readAll()
  return parse<Footer>(map.footer, DEFAULT_FOOTER)
}

export async function getCtaBanner(): Promise<CtaBanner> {
  const map = await readAll()
  return parse<CtaBanner>(map.ctaBanner, DEFAULT_CTA_BANNER)
}

export async function getMembershipSettings(): Promise<Membership> {
  const map = await readAll()
  return parse<Membership>(map.membership, DEFAULT_MEMBERSHIP)
}

export async function getGovHero(): Promise<GovHero> {
  const map = await readAll()
  return parse<GovHero>(map.govHero, DEFAULT_GOV_HERO)
}

export async function getGovFramework(): Promise<GovFramework> {
  const map = await readAll()
  return parse<GovFramework>(map.govFramework, DEFAULT_GOV_FRAMEWORK)
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const map = await readAll()
  const items = parse<MenuItem[]>(map.menu, DEFAULT_MENU).filter((i) => i.label?.trim() && i.href?.trim())
  return ensureVotingMenu(items)
}

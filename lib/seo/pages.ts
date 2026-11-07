// Registry of the site's fixed public pages and their default SEO copy.
// Admin overrides in the SEO dashboard take precedence over these defaults.

export type StaticSchema =
  | "home"
  | "about"
  | "team"
  | "contact"
  | "membership"
  | "collection"
  | "profiles"
  | "webpage"

export type StaticPageDef = {
  path: string
  label: string
  title: string
  description: string
  schema: StaticSchema
  /** Title is used as-is, without the site suffix. */
  fullTitle?: boolean
  noindex?: boolean
  parent?: string
}

export const STATIC_PAGES: StaticPageDef[] = [
  {
    path: "/",
    label: "Homepage",
    title: "VAAP — Virtual Asset Industry Alliance of Pakistan",
    description:
      "Building a responsible, innovative and connected virtual asset ecosystem for Pakistan. People. Innovation. Collaboration.",
    schema: "home",
    fullTitle: true,
  },
  {
    path: "/about",
    label: "About Us",
    title: "About",
    description:
      "The Virtual Asset Industry Alliance of Pakistan (VAAP) is a collective voice for Pakistan's virtual asset industry, supporting responsible growth, collaboration, education, and innovation.",
    schema: "about",
  },
  {
    path: "/team",
    label: "Team & Leadership",
    title: "Team",
    description:
      "Meet the VAAP team — the Chairman and Executive Committee driving the growth, development and responsible adoption of virtual assets in Pakistan.",
    schema: "team",
  },
  {
    path: "/membership",
    label: "Membership",
    title: "Membership",
    description: "Join the Virtual Asset Industry Alliance of Pakistan and help build a responsible digital asset ecosystem.",
    schema: "membership",
  },
  {
    path: "/membership/apply",
    label: "Apply for Membership",
    title: "Apply for Membership",
    description:
      "Apply for VAAP membership in a few simple steps — select your membership type, share your details, and submit for review.",
    schema: "membership",
    parent: "/membership",
  },
  {
    path: "/membership/verify",
    label: "Verify Membership",
    title: "Verify Membership",
    description: "Confirm the status of a VAAP membership by ID or registered email.",
    schema: "webpage",
    parent: "/membership",
  },
  {
    path: "/membership/verified-opinion-leaders",
    label: "Verified Opinion Leaders",
    title: "Verified Opinion Leaders",
    description:
      "Recognized industry experts, founders, and thought leaders shaping Pakistan's digital assets ecosystem, verified by VAAP.",
    schema: "profiles",
    parent: "/membership",
  },
  {
    path: "/news",
    label: "News",
    title: "News",
    description: "The latest news and announcements from the Virtual Asset Industry Alliance of Pakistan.",
    schema: "collection",
  },
  {
    path: "/insights",
    label: "Insights & Articles",
    title: "Insights",
    description: "Member insights, research, and analysis from the Virtual Asset Industry Alliance of Pakistan community.",
    schema: "collection",
  },
  {
    path: "/events",
    label: "Events",
    title: "Events Hub",
    description:
      "Discover, join, and submit digital asset, blockchain, and Web3 events across Pakistan with the Virtual Asset Industry Alliance of Pakistan.",
    schema: "collection",
  },
  {
    path: "/knowledge",
    label: "Knowledge & Resources",
    title: "Knowledge",
    description: "Research, guides, and educational resources on virtual assets in Pakistan.",
    schema: "collection",
  },
  {
    path: "/contact",
    label: "Contact Us",
    title: "Contact",
    description: "Get in touch with the Virtual Asset Industry Alliance of Pakistan.",
    schema: "contact",
  },
  {
    path: "/governance",
    label: "Governance",
    title: "Governance Framework",
    description:
      "A stronger framework for a responsible digital Pakistan. How VAAP fits into the national virtual asset ecosystem and how the association itself is governed.",
    schema: "webpage",
  },
  {
    path: "/community",
    label: "Community",
    title: "Community",
    description: "Join a growing community building Pakistan's virtual asset ecosystem.",
    schema: "webpage",
  },
  {
    path: "/ecosystem",
    label: "Ecosystem",
    title: "Ecosystem",
    description: "Explore the virtual asset ecosystem VAAP represents and connects.",
    schema: "webpage",
  },
  {
    path: "/working-groups",
    label: "Working Groups",
    title: "Working Groups",
    description:
      "VAAP working groups bring together industry experts, professionals and stakeholders to drive the growth, development and responsible adoption of virtual assets in Pakistan.",
    schema: "collection",
  },
  {
    path: "/voting",
    label: "Voting",
    title: "Voting",
    description:
      "Transparent, member-led, blockchain-verified governance. View active votes, upcoming proposals and completed results anchored to the XRP Ledger.",
    schema: "webpage",
  },
  {
    path: "/support",
    label: "Support",
    title: "Support",
    description:
      "The VAAP Member Support & Grievance Centre — submit a complaint, track your case, and access scam awareness and AML/CFT guidance for a safer digital Pakistan.",
    schema: "webpage",
  },
]

export function getStaticPage(path: string) {
  return STATIC_PAGES.find((p) => p.path === path)
}

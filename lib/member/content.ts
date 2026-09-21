// Curated, non-CMS member-portal content. Opportunities and the mission quote
// are editorial constants shown across the member area.

export const MISSION_QUOTE = "Building a transparent, innovative and inclusive virtual asset ecosystem for Pakistan."
export const MISSION_TAGLINE = "Together for a stronger digital Pakistan."

export type Opportunity = {
  id: string
  title: string
  subtitle: string
  icon: "rocket" | "handshake" | "insights"
  href: string
}

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "accelerator",
    title: "Startup Accelerator Program",
    subtitle: "Applications Open",
    icon: "rocket",
    href: "/dashboard/opportunities",
  },
  {
    id: "collaboration",
    title: "Industry Collaboration",
    subtitle: "Partner with VAAP",
    icon: "handshake",
    href: "/dashboard/opportunities",
  },
  {
    id: "research",
    title: "Research Contribution",
    subtitle: "Share Your Insights",
    icon: "insights",
    href: "/dashboard/opportunities",
  },
]

// Shared, framework-agnostic CMS entity configuration.
// Imported by both the admin UI (EntityManager) and the server actions so a
// single field definition drives the form, the list rendering, and parsing.

export type FieldType = "text" | "textarea" | "select" | "checkbox" | "number" | "datetime" | "image" | "richtext" | "file"

export type FieldDef = {
  name: string
  label: string
  type: FieldType
  options?: string[]
  placeholder?: string
  required?: boolean
  nullable?: boolean
  help?: string
  fullWidth?: boolean
  // When set, this field auto-computes an "approx. USD" note from the named
  // sibling PKR field in the same form (admin can still override manually).
  autoUsdFrom?: string
}

export type EntityKey =
  | "publications"
  | "documents"
  | "leadership"
  | "committees"
  | "partners"
  | "officialStatus"
  | "pages"
  | "members"
  | "membershipPlans"
  | "membershipFaqs"

export type EntityConfig = {
  label: string
  singular: string
  description: string
  fields: FieldDef[]
  list: { title: string; subtitle?: string; badge?: string; flag?: string }
  revalidate: string[]
  // Builds the public "view live" URL for a row, or null when not viewable.
  viewUrl?: (row: Record<string, unknown>) => string | null
}

export const ENTITIES: Record<EntityKey, EntityConfig> = {
  pages: {
    label: "Pages",
    singular: "Page",
    description: "Build and publish dynamic pages with hero, content, and SEO metadata.",
    revalidate: ["/", "/[...slug]", "/p/[...slug]"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true, placeholder: "about-us", help: "URL segment, lowercase" },
      { name: "parentSlug", label: "Parent section (optional)", type: "text", nullable: true, placeholder: "community" },
      { name: "status", label: "Status", type: "select", options: ["draft", "published"] },
      { name: "heroTitle", label: "Hero title", type: "text" },
      { name: "heroSubtitle", label: "Hero subtitle", type: "textarea", fullWidth: true },
      { name: "heroImage", label: "Hero image", type: "image", nullable: true },
      { name: "content", label: "Body content", type: "richtext", fullWidth: true, placeholder: "Write the page content. Use the toolbar for headings, lists and links.", help: "Rich text — controls text size, bold, lists and links." },
      { name: "seoTitle", label: "SEO title", type: "text" },
      { name: "metaDescription", label: "Meta description", type: "textarea", fullWidth: true },
    ],
    list: { title: "title", subtitle: "slug", badge: "status" },
    viewUrl: (row) => `/${row.parentSlug ? `${row.parentSlug}/` : ""}${row.slug}`,
  },
  publications: {
    label: "Publications",
    singular: "Publication",
    description: "Research, reports, and knowledge resources shown in the Knowledge Hub.",
    revalidate: ["/knowledge", "/"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: ["Research", "Report", "Whitepaper", "Policy Brief", "Guide"] },
      { name: "author", label: "Author", type: "text" },
      { name: "description", label: "Description", type: "textarea", fullWidth: true },
      { name: "coverImage", label: "Cover image", type: "image", nullable: true },
      { name: "pdfUrl", label: "PDF document", type: "file", nullable: true },
      { name: "membersOnly", label: "Members only", type: "checkbox" },
      { name: "published", label: "Published", type: "checkbox" },
    ],
    list: { title: "title", subtitle: "author", badge: "category", flag: "membersOnly" },
    viewUrl: () => "/knowledge",
  },
  documents: {
    label: "Documents",
    singular: "Document",
    description: "Governance policies, bylaws, and official documents for the Governance section.",
    revalidate: ["/governance", "/"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: ["Governance Policies", "Bylaws & Constitution", "Annual Reports", "Financial Statements", "Meeting Minutes"] },
      { name: "description", label: "Description", type: "textarea", fullWidth: true },
      { name: "fileUrl", label: "Document file", type: "file", nullable: true },
      { name: "published", label: "Published", type: "checkbox" },
    ],
    list: { title: "title", subtitle: "description", badge: "category" },
    viewUrl: () => "/governance",
  },
  leadership: {
    label: "Leadership",
    singular: "Profile",
    description: "Executive committee and leadership profiles shown on About & Governance.",
    revalidate: ["/about", "/governance", "/"],
    fields: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "position", label: "Position", type: "text" },
      { name: "organization", label: "Organization", type: "text" },
      { name: "kind", label: "Type", type: "select", options: ["Chairman", "Executive Committee"], help: "Chairman shows as the featured profile at the top; Executive Committee members show in the grid below." },
      { name: "responsibility", label: "Responsibility / portfolio", type: "text" },
      { name: "bio", label: "Bio / message", type: "richtext", fullWidth: true, placeholder: "Write the bio or leadership message." },
      { name: "photo", label: "Photo", type: "image", nullable: true },
      { name: "linkedin", label: "LinkedIn URL", type: "text", nullable: true, placeholder: "https://linkedin.com/in/…" },
      { name: "x", label: "X (Twitter) URL", type: "text", nullable: true, placeholder: "https://x.com/…" },
      { name: "facebook", label: "Facebook URL", type: "text", nullable: true, placeholder: "https://facebook.com/…" },
      { name: "instagram", label: "Instagram URL", type: "text", nullable: true, placeholder: "https://instagram.com/…" },
      { name: "website", label: "Website URL", type: "text", nullable: true, placeholder: "https://…" },
      { name: "email", label: "Public email", type: "text", nullable: true, placeholder: "name@example.com" },
      { name: "published", label: "Published", type: "checkbox" },
    ],
    list: { title: "name", subtitle: "position", badge: "kind" },
    viewUrl: (row) => `/team/${row.id}`,
  },
  committees: {
    label: "Committees",
    singular: "Committee",
    description: "Industry-led committees and their heads, shown on the Committees page.",
    revalidate: ["/committees", "/governance"],
    fields: [
      { name: "name", label: "Committee name", type: "text", required: true, placeholder: "Policy, Legal & Regulatory Committee" },
      { name: "headName", label: "Committee head — full name", type: "text", placeholder: "Ali Raza Khan" },
      { name: "headTitle", label: "Head title", type: "text", placeholder: "Committee Head", help: "Shown above the committee name on each card." },
      { name: "headPhoto", label: "Head photo", type: "image", nullable: true },
      { name: "headLinkedin", label: "Head LinkedIn URL", type: "text", nullable: true, placeholder: "https://linkedin.com/in/…" },
      { name: "headX", label: "Head X (Twitter) URL", type: "text", nullable: true, placeholder: "https://x.com/…" },
      { name: "headFacebook", label: "Head Facebook URL", type: "text", nullable: true, placeholder: "https://facebook.com/…" },
      { name: "headInstagram", label: "Head Instagram URL", type: "text", nullable: true, placeholder: "https://instagram.com/…" },
      { name: "headWebsite", label: "Head website URL", type: "text", nullable: true, placeholder: "https://…" },
      { name: "headEmail", label: "Head public email", type: "text", nullable: true, placeholder: "name@example.com" },
      { name: "description", label: "Description", type: "textarea", fullWidth: true, help: "Optional — what this committee focuses on." },
      { name: "published", label: "Published", type: "checkbox" },
    ],
    list: { title: "name", subtitle: "headName" },
    viewUrl: (row) => `/committees/${row.id}`,
  },
  partners: {
    label: "Partners",
    singular: "Partner",
    description: "Ecosystem partners and collaborating organizations.",
    revalidate: ["/ecosystem", "/"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "logo", label: "Logo", type: "image", nullable: true },
      { name: "url", label: "Website URL", type: "text", nullable: true },
      { name: "published", label: "Published", type: "checkbox" },
    ],
    list: { title: "name", subtitle: "url" },
    viewUrl: () => "/ecosystem",
  },
  officialStatus: {
    label: "Official Status",
    singular: "Statement",
    description: "Credibility and official recognition statements.",
    revalidate: ["/about", "/"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "body", label: "Body", type: "richtext", fullWidth: true, placeholder: "Write the statement." },
      { name: "documentUrl", label: "Document file", type: "file", nullable: true },
      { name: "documentLabel", label: "Document link label", type: "text" },
      { name: "published", label: "Published", type: "checkbox" },
    ],
    list: { title: "title", subtitle: "body" },
    viewUrl: () => "/about",
  },
  membershipPlans: {
    label: "Membership Plans",
    singular: "Plan",
    description: "Membership categories, pricing, benefits and eligibility shown on the Membership page.",
    revalidate: ["/membership", "/"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, placeholder: "Corporate Membership" },
      { name: "subtitle", label: "Subtitle", type: "text", placeholder: "For Established Businesses and Industry Leaders" },
      {
        name: "icon",
        label: "Icon",
        type: "select",
        options: ["Building2", "Users", "Rocket", "ShieldCheck", "User", "GraduationCap", "Landmark"],
        help: "Icon shown next to the plan.",
      },
      { name: "description", label: "Description", type: "textarea", fullWidth: true },
      { name: "annualFee", label: "Annual fee", type: "text", placeholder: "PKR 500,000 / Complimentary" },
      { name: "annualFeeNote", label: "Annual fee note", type: "text", placeholder: "approx. USD 1,800", autoUsdFrom: "annualFee", help: "Auto-calculated from the annual fee. Toggle to edit manually." },
      { name: "admissionFee", label: "Admission fee (one-time)", type: "text", placeholder: "PKR 100,000 / Waived / None" },
      { name: "admissionFeeNote", label: "Admission fee note", type: "text", placeholder: "approx. USD 360", autoUsdFrom: "admissionFee", help: "Auto-calculated from the admission fee. Toggle to edit manually." },
      { name: "term", label: "Membership term", type: "text", placeholder: "1 Year" },
      {
        name: "benefits",
        label: "Key benefits",
        type: "textarea",
        fullWidth: true,
        placeholder: "One benefit per line",
        help: "Enter one benefit per line.",
      },
      {
        name: "eligibility",
        label: "Eligibility criteria",
        type: "textarea",
        fullWidth: true,
        placeholder: "One criterion per line",
        help: "Enter one eligibility criterion per line.",
      },
      { name: "published", label: "Published", type: "checkbox" },
    ],
    list: { title: "title", subtitle: "subtitle", badge: "annualFee", flag: "published" },
    viewUrl: () => "/membership#categories",
  },
  membershipFaqs: {
    label: "Membership FAQs",
    singular: "FAQ",
    description: "Frequently asked questions shown in the FAQ section of the Membership page.",
    revalidate: ["/membership", "/"],
    fields: [
      { name: "question", label: "Question", type: "text", required: true, placeholder: "Who can become a VAAP member?" },
      {
        name: "answer",
        label: "Answer",
        type: "textarea",
        fullWidth: true,
        placeholder: "Write the answer shown when the question is expanded.",
      },
      { name: "published", label: "Published", type: "checkbox" },
    ],
    list: { title: "question", subtitle: "answer", flag: "published" },
    viewUrl: () => "/membership#faq",
  },
  members: {
    label: "Members",
    singular: "Member",
    description: "Verified member registry, categories, and voting eligibility.",
    revalidate: ["/community", "/admin/members"],
    fields: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email", type: "text", required: true },
      { name: "membershipId", label: "Membership ID", type: "text", help: "Leave blank to auto-generate" },
      { name: "organization", label: "Organization", type: "text", nullable: true },
      { name: "category", label: "Category", type: "select", options: ["Corporate", "International", "Startup", "Professional", "Student", "Media & Influencer", "Verified Community"] },
      { name: "status", label: "Status", type: "select", options: ["active", "suspended", "expired"] },
      { name: "votingEligible", label: "Voting eligible", type: "checkbox" },
      { name: "goodStanding", label: "Good standing", type: "checkbox" },
    ],
    list: { title: "name", subtitle: "organization", badge: "category", flag: "votingEligible" },
  },
}

export const ENTITY_KEYS = Object.keys(ENTITIES) as EntityKey[]

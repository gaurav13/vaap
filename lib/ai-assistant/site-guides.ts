// Code-maintained how-to guides synced into the assistant's knowledge base.
// Each guide names the file it describes; update the guide when that file's flow changes.

export type SiteGuide = { key: string; title: string; category: string; url: string; derivedFrom: string; body: string }

export const SITE_GUIDES: SiteGuide[] = [
  {
    key: "account",
    title: "How to create an account and sign in",
    category: "membership",
    url: "/sign-up",
    derivedFrom: "app/sign-up, app/sign-in",
    body: `Create an account at /sign-up with your name, email and a password, or continue with Google. Existing users sign in at /sign-in. If you forgot your password use "Forgot password" on the sign-in page. After signing in, your Member Dashboard is at /dashboard.`,
  },
  {
    key: "apply",
    title: "How to apply for VAAP membership, choose a category and pay",
    category: "membership",
    url: "/membership/apply",
    derivedFrom: "components/membership/apply/apply-wizard.tsx",
    body: `1. Review membership categories and fees at /membership.
2. Sign in, then open /membership/apply.
3. Choose the membership category that matches you (for example Verified Community Members, or a business / professional category).
4. Complete your profile and application details.
5. Pay the annual fee plus the one-time admission fee by card or the other payment methods shown. Any active launch discount is applied automatically at checkout.
6. After payment is verified, VAAP staff review the application. Track it on /dashboard.
Payment alone does not grant voting rights; those need separate verification and approval.`,
  },
  {
    key: "status",
    title: "How to check membership status and renew",
    category: "membership",
    url: "/dashboard/membership",
    derivedFrom: "lib/membership-state.ts, app/dashboard/membership",
    body: `Your status shows on /dashboard and /dashboard/membership: Not Applied, Not Paid, Pending Approval, Active Member, Expired, Suspended or Application Rejected, with the next step. Memberships last one year. To renew an expired membership, sign in and follow the renewal prompt on the dashboard or visit /membership.`,
  },
  {
    key: "certificate",
    title: "How to download the membership certificate",
    category: "membership",
    url: "/dashboard/membership",
    derivedFrom: "lib/certificates.ts, app/dashboard/membership",
    body: `Active members can download their digital membership certificate from Dashboard → Membership (/dashboard/membership) → Download Certificate. Each certificate has a verification link that others can use at /membership/verify to confirm the member's status. If no certificate is shown, the membership may still be pending approval; contact /support if it is active but missing.`,
  },
  {
    key: "profile",
    title: "How to update your profile",
    category: "membership",
    url: "/dashboard/profile",
    derivedFrom: "app/dashboard/profile",
    body: `Sign in and open /dashboard/profile to update your name, organization, designation, city, bio and links. Account and notification settings are under /dashboard/settings.`,
  },
  {
    key: "voting",
    title: "Voting eligibility and access issues",
    category: "governance",
    url: "/dashboard/voting",
    derivedFrom: "lib/voting-rights.ts, lib/governance.ts",
    body: `To vote you need (1) an active, paid membership, and (2) voting rights approved by VAAP administration after identity (CNIC) and, where applicable, tax (NTN) verification. Some proposals are limited to particular membership categories or selected members. Paying the fee does not automatically make you eligible. Request or check voting access at /dashboard/voting; open proposals are under /dashboard/governance and elections under /dashboard/elections. If your request was rejected or suspended, contact /support.`,
  },
  {
    key: "kol",
    title: "Verified Opinion Leader (KOL) application and referral dashboard",
    category: "membership",
    url: "/dashboard/kol",
    derivedFrom: "components/kol/kol-workspace.tsx, lib/kol.ts",
    body: `Members invited to the Verified Opinion Leaders programme complete their profile at /dashboard/kol: photo, professional details, platforms and follower counts, and evidence. Submit it for review; statuses are draft, pending, under review, information required, verified, rejected, expired or revoked. Verification is valid for a fixed period and must be renewed before it expires. Verified profiles are listed at /membership/verified-opinion-leaders. Referral links and earnings are on /dashboard/referrals.`,
  },
  {
    key: "leadership-apply",
    title: "How to apply for a leadership position",
    category: "governance",
    url: "/leadership/apply",
    derivedFrom: "app/leadership/apply",
    body: `Members can apply to become Advisory Board Members or Industry Advisor Members at /leadership/apply. Office bearers (Chairman, Senior Vice Chairman, Vice Chairman) are appointed, not applied for. Applications are reviewed by VAAP administration and you are notified of the outcome; approved profiles are published under /leadership.`,
  },
  {
    key: "events",
    title: "Events: attending and submitting",
    category: "events",
    url: "/events",
    derivedFrom: "app/events, app/dashboard/events",
    body: `Browse upcoming events at /events and register or RSVP from the event page. Active members can submit their own events from /dashboard/events; submissions are reviewed by VAAP staff before they are published.`,
  },
  {
    key: "support",
    title: "How to submit a support ticket or report a concern",
    category: "general",
    url: "/support",
    derivedFrom: "app/support, components/support/complaint-form.tsx",
    body: `Open /support, choose a category, describe the issue and submit. You receive a reference number by email. Track progress on /support or /dashboard/support with that reference; statuses move from received to under review to resolved, and staff may add a status note. VAAP does not promise specific outcomes, compensation or response times. Never share passwords, private keys or seed phrases.`,
  },
  {
    key: "lawyers-network",
    title: "Lawyers Network and P2P dispute support (planned service)",
    category: "general",
    url: "/support",
    derivedFrom: "Management brief",
    body: `VAAP is developing a Lawyers Network to connect individuals and businesses facing P2P-related disputes (frozen bank accounts, payment disputes, transaction complaints, contractual matters) with qualified legal professionals in Pakistan. This is a planned service. You can submit your case through /support, and a participating lawyer may review your situation and explain the available legal options. VAAP cannot unfreeze accounts, reverse payments, influence investigations or guarantee legal outcomes, and the assistant does not give individual legal conclusions.`,
  },
]

/** Topics the brief asks about that have no published content yet; shown to admins as coverage gaps. */
export const COVERAGE_GAPS = [
  { topic: "Lawyers Network page", hint: "Publish a CMS page describing the service, eligibility and how cases are routed." },
  { topic: "University Drive", hint: "Publish details on participating universities, eligibility and how to apply." },
  { topic: "Startup programme / Hackathon", hint: "Publish participation rules, timelines and application route." },
  { topic: "Contracts, MoUs and partnerships", hint: "Publish the public procedure for each agreement type (purpose, eligibility, documents, approval, signing)." },
  { topic: "Event and summit sponsorship", hint: "Publish sponsorship packages or the enquiry route." },
]

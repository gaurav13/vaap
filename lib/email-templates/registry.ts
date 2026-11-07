// Catalogue of every automated email the website sends. The defaults mirror
// the copy that was previously hardcoded at each trigger, so a template that
// has never been edited in the admin dashboard sends exactly what it always did.
// This module is client-safe: the admin editor uses it for previews.

export type EmailContent = {
  subject: string
  heading: string
  /** Paragraphs separated by a blank line. Supports **bold** and [label](https://link). */
  body: string
  ctaLabel: string
  /** Absolute URL, site path (e.g. /dashboard) or a variable such as {{url}}. */
  ctaUrl: string
  footnote: string
  /** Hex colour used for the header rule, heading, links and button. */
  accentColor: string
  /** Small uppercase label at the top of the email. */
  headerLabel: string
}

export type EmailVariable = { name: string; description: string; sample: string }

export type EmailTemplateDefinition = {
  key: string
  name: string
  category: "Account" | "Membership" | "Applications" | "Support" | "Engagement" | "KOL"
  trigger: string
  /** Where in the codebase the email is sent from, for reference. */
  recipient: string
  variables: EmailVariable[]
  defaults: EmailContent
}

export const DEFAULT_ACCENT = "#15803d"
export const DEFAULT_HEADER_LABEL = "Virtual Asset Industry Alliance of Pakistan"

const base = { accentColor: DEFAULT_ACCENT, headerLabel: DEFAULT_HEADER_LABEL, ctaLabel: "", ctaUrl: "", footnote: "" }

const NAME: EmailVariable = { name: "name", description: "Recipient's name", sample: "Ayesha Khan" }
const CATEGORY: EmailVariable = { name: "category", description: "Membership category", sample: "Corporate Members" }

export const EMAIL_TEMPLATES = [
  {
    key: "auth.verify-email",
    name: "Email Verification",
    category: "Account",
    trigger: "A new account is registered with email and password",
    recipient: "New user",
    variables: [NAME, { name: "url", description: "One-time verification link", sample: "https://vaap.org.pk/api/auth/verify-email?token=sample" }],
    defaults: {
      ...base,
      subject: "Verify your VAAP email address",
      heading: "Confirm your email address",
      body: "Welcome to the Virtual Asset Industry Alliance of Pakistan, {{name}}.\n\nPlease confirm this email address so we can keep your account and membership updates secure.",
      ctaLabel: "Verify email address",
      ctaUrl: "{{url}}",
      footnote: "If you didn't create a VAAP account, you can safely ignore this email.",
    },
  },
  {
    key: "auth.password-reset",
    name: "Password Reset",
    category: "Account",
    trigger: "A user requests a password reset from the sign-in page",
    recipient: "Account holder",
    variables: [{ name: "url", description: "Password reset link (expires shortly)", sample: "https://vaap.org.pk/reset-password?token=sample" }],
    defaults: {
      ...base,
      subject: "Reset your VAAP password",
      heading: "Reset your VAAP password",
      body: "You requested a password reset for your Virtual Asset Industry Alliance of Pakistan account. Click the button below to choose a new password.\n\nIf the button doesn't work, copy and paste this link into your browser: [{{url}}]({{url}})",
      ctaLabel: "Choose a new password",
      ctaUrl: "{{url}}",
      footnote: "If you did not request this, you can safely ignore this email. The link will expire shortly.",
    },
  },
  {
    key: "account.welcome",
    name: "Welcome / Registration",
    category: "Account",
    trigger: "A new user account is created (email or Google sign-up)",
    recipient: "New user",
    variables: [NAME],
    defaults: {
      ...base,
      subject: "Welcome to the Virtual Asset Industry Alliance of Pakistan",
      heading: "Welcome aboard, {{name}}",
      body: "Thank you for joining the Virtual Asset Industry Alliance of Pakistan.\n\nYour account is ready. From your dashboard you can manage your profile, track your membership, register to vote, and stay up to date with events and resources.",
      ctaLabel: "Open your dashboard",
      ctaUrl: "/dashboard",
    },
  },
  {
    key: "application.received",
    name: "Membership Application & Payment Received",
    category: "Applications",
    trigger: "An applicant completes the membership application and payment step",
    recipient: "Applicant",
    variables: [NAME, CATEGORY, { name: "reference", description: "Application reference (may be empty)", sample: "VAAP-2026-000123" }],
    defaults: {
      ...base,
      subject: "We received your VAAP membership application",
      heading: "Application received",
      body: "Thank you for applying for {{category}} membership with the Virtual Asset Industry Alliance of Pakistan.\n\nYour application reference is **{{reference}}**. Please keep it for your records.\n\nWe'll email you as soon as there's an update, and you can track the status from your member dashboard.",
      ctaLabel: "View my applications",
      ctaUrl: "/dashboard/applications",
      footnote: "If you paid by crypto, approval follows once your transaction is confirmed.",
    },
  },
  {
    key: "admin.new-paid-application",
    name: "New Paid Application (Admin Alert)",
    category: "Applications",
    trigger: "An applicant completes the membership application with card or crypto payment",
    recipient: "VAAP admin team (support mailbox)",
    variables: [
      NAME,
      CATEGORY,
      { name: "email", description: "Applicant's email", sample: "ayesha@example.com" },
      { name: "phone", description: "Applicant's phone", sample: "+92 300 1234567" },
      { name: "organization", description: "Company / organisation", sample: "Khan Digital Assets Ltd" },
      { name: "reference", description: "Application reference", sample: "VAAP-2026-000123" },
      { name: "paymentMethod", description: "Card or crypto", sample: "Crypto Payment" },
      { name: "cryptoCoin", description: "Coin and network selected", sample: "BTC (Bitcoin)" },
      { name: "walletAddress", description: "VAAP wallet address shown to the applicant", sample: "1FJycQmfrfKkR2bfuuGqKH5CK6yjegqYvT" },
      { name: "transactionId", description: "Crypto TXID or Stripe session ID", sample: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b" },
      { name: "totalAmount", description: "Total amount due", sample: "PKR 150,000" },
    ],
    defaults: {
      ...base,
      subject: "New paid application: {{name}} — {{category}} ({{paymentMethod}})",
      heading: "New paid membership application",
      body: "**{{name}}** has submitted a {{category}} application with payment.\n\n**Reference:** {{reference}}\n**Email:** {{email}}\n**Phone:** {{phone}}\n**Organisation:** {{organization}}\n\n**Payment method:** {{paymentMethod}}\n**Coin / network:** {{cryptoCoin}}\n**Wallet address:** {{walletAddress}}\n**Transaction ID:** {{transactionId}}\n**Total amount:** {{totalAmount}}\n\nPlease verify the payment and review the application.",
      ctaLabel: "Review application",
      ctaUrl: "/admin/applications",
      footnote: "For crypto payments, confirm the TXID on the blockchain explorer before approving.",
    },
  },
  {
    key: "application.enquiry-received",
    name: "Membership Enquiry Received",
    category: "Applications",
    trigger: "A visitor submits the short membership enquiry form",
    recipient: "Enquirer",
    variables: [NAME, CATEGORY],
    defaults: {
      ...base,
      subject: "We received your VAAP membership application",
      heading: "Application received",
      body: "Thank you for your interest in {{category}} membership with the Virtual Asset Industry Alliance of Pakistan.\n\nOur team will review your application and get back to you shortly.",
    },
  },
  {
    key: "application.dashboard-submitted",
    name: "Dashboard Application / Upgrade Request",
    category: "Applications",
    trigger: "A signed-in user applies or requests an upgrade from the member dashboard",
    recipient: "Member",
    variables: [NAME, { name: "targetCategory", description: "Requested category (may be empty)", sample: "Corporate Members" }],
    defaults: {
      ...base,
      subject: "We received your VAAP membership application",
      heading: "Application received",
      body: "Thank you — we've received your membership application.\n\nOur team will review it and let you know as soon as there's an update. You can track its status any time from your dashboard.",
      ctaLabel: "View my applications",
      ctaUrl: "/dashboard/applications",
    },
  },
  {
    key: "membership.renewal-received",
    name: "Renewal Request Received",
    category: "Membership",
    trigger: "A member submits a renewal request from the dashboard",
    recipient: "Member",
    variables: [NAME, { name: "membershipId", description: "Membership ID", sample: "VAAP-2026-000123" }],
    defaults: {
      ...base,
      subject: "We received your VAAP membership renewal request",
      heading: "Renewal request received",
      body: "Thank you — we've received your renewal request for membership {{membershipId}}.\n\nOur team will review it and update you once it has been processed. You can track its status any time from your dashboard.",
      ctaLabel: "View my applications",
      ctaUrl: "/dashboard/applications",
    },
  },
  {
    key: "membership.approved",
    name: "Membership Approved / Confirmation",
    category: "Membership",
    trigger: "An admin approves a membership application",
    recipient: "Applicant",
    variables: [NAME, CATEGORY, { name: "membershipId", description: "Newly issued membership ID", sample: "VAAP-2026-000123" }],
    defaults: {
      ...base,
      subject: "Your VAAP membership is approved",
      heading: "Welcome to VAAP, {{name}}",
      body: "Congratulations — your {{category}} membership has been approved and is now active.\n\nYour membership ID is **{{membershipId}}**. You can view your membership card, register to vote, and access member resources from your dashboard.",
      ctaLabel: "Go to my membership",
      ctaUrl: "/dashboard/membership",
    },
  },
  {
    key: "application.rejected",
    name: "Application Not Approved",
    category: "Applications",
    trigger: "An admin rejects a membership application",
    recipient: "Applicant",
    variables: [NAME],
    defaults: {
      ...base,
      subject: "Update on your VAAP membership application",
      heading: "Application update",
      body: "Dear {{name}},\n\nThank you for your interest in the Virtual Asset Industry Alliance of Pakistan. After careful review, we're unable to approve your membership application at this time.\n\nIf you believe this was in error or would like guidance on reapplying, simply reply to this email and our team will be glad to help.",
      footnote: "This decision does not prevent you from applying again in the future.",
    },
  },
  {
    key: "membership.active",
    name: "Membership Activated",
    category: "Membership",
    trigger: "Staff set a member's status to Active",
    recipient: "Member",
    variables: [NAME],
    defaults: {
      ...base,
      subject: "Your VAAP membership is now active",
      heading: "Your membership is active",
      body: "Dear {{name}},\n\nGood news — your membership with the Virtual Asset Industry Alliance of Pakistan is now active and in good standing.\n\nYou have full access to member resources, events, and voting eligibility where applicable.",
      ctaLabel: "View my membership",
      ctaUrl: "/dashboard/membership",
    },
  },
  {
    key: "membership.suspended",
    name: "Membership Suspended",
    category: "Membership",
    trigger: "Staff set a member's status to Suspended",
    recipient: "Member",
    variables: [NAME],
    defaults: {
      ...base,
      subject: "Your VAAP membership has been suspended",
      heading: "Your membership has been suspended",
      body: "Dear {{name}},\n\nYour membership with the Virtual Asset Industry Alliance of Pakistan has been suspended.\n\nIf you have questions or believe this was in error, please reply to this email and our team will assist you.",
      ctaLabel: "View my membership",
      ctaUrl: "/dashboard/membership",
    },
  },
  {
    key: "membership.expired",
    name: "Membership Expired",
    category: "Membership",
    trigger: "Staff set a member's status to Expired",
    recipient: "Member",
    variables: [NAME],
    defaults: {
      ...base,
      subject: "Your VAAP membership has expired",
      heading: "Your membership has expired",
      body: "Dear {{name}},\n\nYour membership with the Virtual Asset Industry Alliance of Pakistan has expired.\n\nYou can renew from your dashboard to restore full member access and benefits.",
      ctaLabel: "Renew my membership",
      ctaUrl: "/dashboard/membership",
    },
  },
  {
    key: "support.complaint-received",
    name: "Support Case Received",
    category: "Support",
    trigger: "A complaint is submitted through the Member Support & Grievance Centre",
    recipient: "Complainant",
    variables: [
      NAME,
      { name: "category", description: "Complaint category", sample: "Complaint Assistance" },
      { name: "reference", description: "Case reference", sample: "VAAP-CASE-000042" },
    ],
    defaults: {
      ...base,
      subject: "Your VAAP case reference {{reference}}",
      heading: "We've received your submission",
      body: "Thank you for contacting the VAAP Member Support & Grievance Centre regarding \"{{category}}\".\n\nYour case reference is **{{reference}}**. Please keep it — you can use it any time to track your case status.\n\nOur team reviews every submission and will guide you or refer the matter to the relevant authority where needed.",
      footnote:
        "VAAP is an industry association and does not have regulatory, investigative or enforcement powers. Matters involving unlicensed providers, fraud or regulatory violations may be referred to PVARA or other competent authorities.",
    },
  },
  {
    key: "automation.article-invite",
    name: "Weekly Article Invitation",
    category: "Engagement",
    trigger: "Weekly automation for confirmed members",
    recipient: "Confirmed members",
    variables: [NAME],
    defaults: {
      ...base,
      subject: "Share your expertise with the VAAP community",
      heading: "Write for VAAP this week",
      body: "Dear {{name}},\n\nWe invite you to submit an article for publication on the VAAP website. Member insights on regulation, compliance, technology and market developments help the whole industry move forward.\n\n**Submission guidelines**\n- Original work between 600 and 1,500 words\n- A clear title and a short summary\n- Factual, non-promotional and properly sourced\n- Optional cover image you have the rights to use\n\nOur editorial team reviews every submission before publication.",
      ctaLabel: "Submit Your Article",
      ctaUrl: "/dashboard/articles",
      footnote: "You receive this because you are a confirmed VAAP member.",
    },
  },
  {
    key: "automation.event-announcement",
    name: "Event Announcement",
    category: "Engagement",
    trigger: "An event is published, or an admin announces it manually",
    recipient: "Confirmed members",
    variables: [
      NAME,
      { name: "eventTitle", description: "Event title", sample: "Virtual Assets Compliance Roundtable" },
      { name: "eventDate", description: "Event date and time", sample: "Thursday, 20 November 2026 · 3:00 PM" },
      { name: "eventLocation", description: "Venue or online location", sample: "Islamabad · Serena Hotel" },
      { name: "eventDescription", description: "Event description", sample: "A closed-door discussion on upcoming licensing requirements." },
      { name: "eventUrl", description: "Event registration page", sample: "https://vaap.org.pk/events/1" },
    ],
    defaults: {
      ...base,
      subject: "You're invited: {{eventTitle}}",
      heading: "{{eventTitle}}",
      body: "Dear {{name}},\n\nA new event has been published and you are invited to take part.\n\n**Date:** {{eventDate}}\n**Location:** {{eventLocation}}\n\n{{eventDescription}}",
      ctaLabel: "Register for Event",
      ctaUrl: "{{eventUrl}}",
      footnote: "Seats may be limited, so please register early.",
    },
  },
  {
    key: "automation.newsletter",
    name: "Weekly Newsletter",
    category: "Engagement",
    trigger: "Weekly digest generated from published website content",
    recipient: "Confirmed members",
    variables: [
      NAME,
      { name: "weekLabel", description: "Week covered by the issue", sample: "Week of 2 November 2026" },
      { name: "digest", description: "Generated list of articles, events and news", sample: "**Latest articles**\n- [Sample article](https://vaap.org.pk)" },
    ],
    defaults: {
      ...base,
      subject: "VAAP Weekly · {{weekLabel}}",
      heading: "This week at VAAP",
      body: "Dear {{name}},\n\nHere is your round-up of the latest from the Virtual Asset Industry Alliance of Pakistan.\n\n{{digest}}\n\n**Membership opportunities**\nInvite colleagues to join VAAP, submit an article, or host an event for the community from your member dashboard.",
      ctaLabel: "Open your dashboard",
      ctaUrl: "/dashboard",
      footnote: "",
    },
  },
  {
    key: "automation.verification-reminder",
    name: "Verification Reminder",
    category: "Engagement",
    trigger: "Account email is still unverified",
    recipient: "Pending verification",
    variables: [NAME, { name: "url", description: "Secure verification link (expires in 7 days)", sample: "https://vaap.org.pk/api/email/verify?token=sample" }],
    defaults: {
      ...base,
      subject: "Please verify your VAAP membership",
      heading: "One step left: verify your membership",
      body: "Dear {{name}},\n\nYour VAAP account is not verified yet. Verifying confirms your email address and unlocks your full member dashboard, voting eligibility and member communications.",
      ctaLabel: "Verify Your Membership",
      ctaUrl: "{{url}}",
      footnote: "This secure link expires in 7 days. If you did not create a VAAP account, you can ignore this email.",
    },
  },
  {
    key: "automation.incomplete-application",
    name: "Incomplete Application Reminder",
    category: "Engagement",
    trigger: "A membership application was started but not submitted",
    recipient: "Incomplete applications",
    variables: [NAME, CATEGORY, { name: "url", description: "Secure link to the saved application (expires in 7 days)", sample: "https://vaap.org.pk/membership/apply?resume=sample" }],
    defaults: {
      ...base,
      subject: "Your VAAP membership application is waiting",
      heading: "Complete your membership application",
      body: "Dear {{name}},\n\nYou started an application for **{{category}}** but have not submitted it yet. Your details are saved, so you can pick up right where you left off.\n\nOnce submitted, our membership team will review your application and be in touch.",
      ctaLabel: "Complete Your Membership",
      ctaUrl: "{{url}}",
      footnote: "This secure link expires in 7 days. If you no longer wish to apply, you can ignore this email.",
    },
  },
  {
    key: "kol.invitation",
    name: "KOL Verification Invitation",
    category: "KOL",
    trigger: "An admin invites a member to apply for Verified KOL status",
    recipient: "Invited member",
    variables: [NAME],
    defaults: {
      ...base,
      subject: "You're invited to become a Verified VAAP Opinion Leader",
      heading: "Apply for Verified KOL status",
      body: "Dear {{name}},\n\nVAAP is recognising members who shape conversations around Pakistan's digital asset ecosystem. Based on your work and audience, we'd like to invite you to apply for **Verified KOL** status.\n\nVerified KOLs receive a public profile in the VAAP Opinion Leaders directory and a verification badge on their member profile.",
      ctaLabel: "Start your application",
      ctaUrl: "/dashboard/kol",
      footnote: "Applying is optional and does not affect your VAAP membership.",
    },
  },
  {
    key: "kol.application-received",
    name: "KOL Application Received",
    category: "KOL",
    trigger: "A member submits a KOL verification application",
    recipient: "Applicant",
    variables: [NAME],
    defaults: {
      ...base,
      subject: "We've received your KOL verification application",
      heading: "Application received",
      body: "Dear {{name}},\n\nThank you for applying for Verified KOL status. Our team will review your profile, social accounts and supporting evidence, and we'll email you as soon as there's an update.",
      ctaLabel: "View application status",
      ctaUrl: "/dashboard/kol",
      footnote: "",
    },
  },
  {
    key: "kol.info-requested",
    name: "KOL Additional Information Requested",
    category: "KOL",
    trigger: "An admin requests more information on a KOL application",
    recipient: "Applicant",
    variables: [NAME, { name: "note", description: "Reviewer's request", sample: "Please add a screenshot of your LinkedIn analytics." }],
    defaults: {
      ...base,
      subject: "More information needed for your KOL application",
      heading: "Additional information required",
      body: "Dear {{name}},\n\nOur reviewers need a little more information before completing your Verified KOL review:\n\n**{{note}}**\n\nPlease update your application from your member dashboard and resubmit it.",
      ctaLabel: "Update application",
      ctaUrl: "/dashboard/kol",
      footnote: "",
    },
  },
  {
    key: "kol.approved",
    name: "KOL Verification Approved",
    category: "KOL",
    trigger: "An admin approves a KOL application",
    recipient: "Verified KOL",
    variables: [NAME, { name: "url", description: "Public KOL profile link", sample: "https://vaap.org.pk/membership/verified-opinion-leaders/ayesha-khan" }, { name: "expires", description: "Verification expiry date", sample: "07 Nov 2027" }],
    defaults: {
      ...base,
      subject: "Congratulations — you're a Verified VAAP Opinion Leader",
      heading: "You're now a Verified KOL",
      body: "Dear {{name}},\n\nYour application has been approved. Your public profile is now live in the VAAP Opinion Leaders directory and your member profile shows the Verified KOL badge.\n\nYour verification is valid until **{{expires}}**. Please keep your social statistics up to date from your dashboard.",
      ctaLabel: "View your public profile",
      ctaUrl: "{{url}}",
      footnote: "",
    },
  },
  {
    key: "kol.rejected",
    name: "KOL Verification Rejected",
    category: "KOL",
    trigger: "An admin rejects a KOL application",
    recipient: "Applicant",
    variables: [NAME, { name: "note", description: "Reason for the decision", sample: "We could not confirm ownership of the listed accounts." }],
    defaults: {
      ...base,
      subject: "Update on your KOL verification application",
      heading: "Your application was not approved",
      body: "Dear {{name}},\n\nThank you for applying for Verified KOL status. After review, we're unable to approve your application at this time.\n\n**Reviewer note:** {{note}}\n\nYou're welcome to update your details and reapply in the future. Your VAAP membership is not affected.",
      ctaLabel: "View application",
      ctaUrl: "/dashboard/kol",
      footnote: "",
    },
  },
  {
    key: "kol.expiry-reminder",
    name: "KOL Verification Expiry Reminder",
    category: "KOL",
    trigger: "A Verified KOL's status expires within 30 days",
    recipient: "Verified KOL",
    variables: [NAME, { name: "expires", description: "Verification expiry date", sample: "07 Nov 2027" }],
    defaults: {
      ...base,
      subject: "Your Verified KOL status expires soon",
      heading: "Time to renew your verification",
      body: "Dear {{name}},\n\nYour Verified KOL status expires on **{{expires}}**. Update your social statistics and resubmit your profile so our team can renew your verification without interruption.",
      ctaLabel: "Renew verification",
      ctaUrl: "/dashboard/kol",
      footnote: "",
    },
  },
  {
    key: "kol.revoked",
    name: "KOL Verification Revoked",
    category: "KOL",
    trigger: "An admin revokes a KOL's verification",
    recipient: "Former Verified KOL",
    variables: [NAME, { name: "note", description: "Reason for revocation", sample: "Account ownership could no longer be confirmed." }],
    defaults: {
      ...base,
      subject: "Your Verified KOL status has been revoked",
      heading: "Verification revoked",
      body: "Dear {{name}},\n\nYour Verified KOL status has been revoked and your public profile has been removed from the directory.\n\n**Reason:** {{note}}\n\nIf you believe this is a mistake, please reply to this email. Your VAAP membership is not affected.",
      ctaLabel: "",
      ctaUrl: "",
      footnote: "",
    },
  },
] as const satisfies readonly EmailTemplateDefinition[]

export type EmailTemplateKey = (typeof EMAIL_TEMPLATES)[number]["key"]

export function getTemplateDefinition(key: string): EmailTemplateDefinition | undefined {
  return (EMAIL_TEMPLATES as readonly EmailTemplateDefinition[]).find((t) => t.key === key)
}

export function sampleVars(def: EmailTemplateDefinition): Record<string, string> {
  return Object.fromEntries(def.variables.map((v) => [v.name, v.sample]))
}

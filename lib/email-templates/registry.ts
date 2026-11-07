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
  category: "Account" | "Membership" | "Applications" | "Support"
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
] as const satisfies readonly EmailTemplateDefinition[]

export type EmailTemplateKey = (typeof EMAIL_TEMPLATES)[number]["key"]

export function getTemplateDefinition(key: string): EmailTemplateDefinition | undefined {
  return (EMAIL_TEMPLATES as readonly EmailTemplateDefinition[]).find((t) => t.key === key)
}

export function sampleVars(def: EmailTemplateDefinition): Record<string, string> {
  return Object.fromEntries(def.variables.map((v) => [v.name, v.sample]))
}

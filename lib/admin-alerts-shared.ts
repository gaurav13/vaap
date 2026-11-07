// Client-safe definitions for admin email notifications.

export const ADMIN_ALERTS = [
  {
    type: "kol",
    label: "New KOL applications",
    description: "When a member submits a KOL verification application.",
    templateKey: "admin.kol-application",
  },
  {
    type: "article",
    label: "New article submissions",
    description: "When a member submits an article for review.",
    templateKey: "admin.article-submitted",
  },
  {
    type: "event",
    label: "New event submissions",
    description: "When a member submits an event for publication.",
    templateKey: "admin.event-submitted",
  },
  {
    type: "registration",
    label: "New event registrations",
    description: "When someone registers to attend an event.",
    templateKey: "admin.event-registration",
  },
  {
    type: "contact",
    label: "Contact Us inquiries",
    description: "When someone submits the Contact Us form.",
    templateKey: "admin.contact-message",
  },
  {
    type: "report",
    label: "Report a Concern submissions",
    description: "Sends only the reference, category and a safe summary. Reporter identity is never emailed.",
    templateKey: "admin.concern-report",
  },
] as const

export type AdminAlertType = (typeof ADMIN_ALERTS)[number]["type"]

export type AdminAlertConfig = {
  recipients: string[]
  enabled: Record<AdminAlertType, boolean>
}

export const ADMIN_ALERTS_SETTINGS_KEY = "adminEmailNotifications"
export const MAX_ALERT_RECIPIENTS = 5

export function isAdminAlertType(value: string): value is AdminAlertType {
  return ADMIN_ALERTS.some((a) => a.type === value)
}

/** Report categories whose description is never included in an email. */
export const SENSITIVE_REPORT_CATEGORIES = ["Scam / Fraud Report", "AML/CFT Question", "Regulatory Referral"]

// Client-safe catalogue of automated engagement workflows.

export type SegmentKey =
  | "confirmed"
  | "pending-verification"
  | "incomplete-applications"
  | "expired"
  | "inactive"
  | "registered-unpaid"

export const SEGMENTS: { key: SegmentKey; name: string; description: string }[] = [
  { key: "confirmed", name: "Confirmed Members", description: "Active members in good standing with a current membership." },
  { key: "pending-verification", name: "Pending Verification", description: "Accounts that have not verified their email address yet." },
  { key: "incomplete-applications", name: "Incomplete Applications", description: "Applications started but never submitted, with no active membership." },
  { key: "expired", name: "Expired Memberships", description: "Members whose membership has expired." },
  { key: "inactive", name: "Inactive Members", description: "Suspended members or members not in good standing." },
  {
    key: "registered-unpaid",
    name: "Registered, Not Subscribed",
    description: "Verified website accounts that have never activated a paid membership and have no payment awaiting verification.",
  },
]

export type AutomationKey =
  | "article-invite"
  | "event-announcement"
  | "newsletter"
  | "verification-reminder"
  | "incomplete-application"
  | "membership-invitation"

export const DEFAULT_REMINDER_DAYS = [3, 7, 14]
export const DEFAULT_DAILY_LIMIT = 100

export type AutomationConfig = {
  /** Membership invitation: days after registration for reminders 1, 2 and final. */
  reminderDays?: number[]
  /** Membership invitation: maximum emails sent per daily run. */
  dailyLimit?: number
  /** 0 = Sunday … 6 = Saturday (UTC) for weekly automations. */
  weekday?: number
  /** Newsletter: "review" saves a draft for approval, "auto" sends it. */
  mode?: "review" | "auto"
  intervalDays?: number
  maxReminders?: number
  followUp3d?: boolean
  followUp7d?: boolean
}

export type AutomationDefinition = {
  key: AutomationKey
  name: string
  description: string
  segment: SegmentKey
  templateKey: string
  /** Marketing emails carry an unsubscribe link and honour opt-outs. */
  marketing: boolean
  schedule: "weekly" | "on-publish" | "daily"
  /** Off until an admin switches it on (used for automations that email existing users). */
  defaultEnabled?: boolean
  defaults: AutomationConfig
}

export const AUTOMATIONS: AutomationDefinition[] = [
  {
    key: "article-invite",
    name: "Weekly Article Invitation",
    description: "Invites confirmed members to submit an article for publication.",
    segment: "confirmed",
    templateKey: "automation.article-invite",
    marketing: true,
    schedule: "weekly",
    defaults: { weekday: 1 },
  },
  {
    key: "event-announcement",
    name: "Event Announcements",
    description: "Announces each newly published event to confirmed members.",
    segment: "confirmed",
    templateKey: "automation.event-announcement",
    marketing: true,
    schedule: "on-publish",
    defaults: {},
  },
  {
    key: "newsletter",
    name: "Weekly Newsletter",
    description: "Collects the week's articles, events and news into a newsletter.",
    segment: "confirmed",
    templateKey: "automation.newsletter",
    marketing: true,
    schedule: "weekly",
    defaults: { weekday: 5, mode: "review" },
  },
  {
    key: "verification-reminder",
    name: "Verification Reminders",
    description: "Reminds account holders to verify their email; stops once verified.",
    segment: "pending-verification",
    templateKey: "automation.verification-reminder",
    marketing: false,
    schedule: "daily",
    defaults: { intervalDays: 3, maxReminders: 3 },
  },
  {
    key: "incomplete-application",
    name: "Incomplete Application Reminders",
    description: "Reminds applicants 24 hours after they stop, with optional 3 and 7 day follow-ups.",
    segment: "incomplete-applications",
    templateKey: "automation.incomplete-application",
    marketing: false,
    schedule: "daily",
    defaults: { followUp3d: true, followUp7d: true },
  },
  {
    key: "membership-invitation",
    name: "Membership Invitations & Reminders",
    description:
      "Invites registered users to activate a paid membership, then reminds them. Stops immediately once their membership is active or a payment is awaiting verification.",
    segment: "registered-unpaid",
    templateKey: "automation.membership-invitation",
    marketing: true,
    schedule: "daily",
    defaultEnabled: false,
    defaults: { reminderDays: DEFAULT_REMINDER_DAYS, dailyLimit: DEFAULT_DAILY_LIMIT },
  },
]

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function getAutomation(key: string) {
  return AUTOMATIONS.find((a) => a.key === key)
}

export function describeSchedule(def: AutomationDefinition, config: AutomationConfig) {
  if (def.schedule === "weekly") return `Weekly on ${WEEKDAYS[config.weekday ?? 1]} (09:00 UTC)`
  if (def.schedule === "on-publish") return "When an event is published"
  if (def.key === "membership-invitation") {
    const days = config.reminderDays ?? DEFAULT_REMINDER_DAYS
    return `Invite after registration, remind after ${days.join(", ")} days · max ${config.dailyLimit ?? DEFAULT_DAILY_LIMIT}/day`
  }
  if (def.key === "verification-reminder") {
    return `Every ${config.intervalDays ?? 3} days, up to ${config.maxReminders ?? 3} reminders`
  }
  const stages = ["24 hours", config.followUp3d ? "3 days" : "", config.followUp7d ? "7 days" : ""].filter(Boolean)
  return `After ${stages.join(", ")} of inactivity`
}

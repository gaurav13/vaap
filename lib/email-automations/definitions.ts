// Client-safe catalogue of automated engagement workflows.

export type SegmentKey = "confirmed" | "pending-verification" | "incomplete-applications" | "expired" | "inactive"

export const SEGMENTS: { key: SegmentKey; name: string; description: string }[] = [
  { key: "confirmed", name: "Confirmed Members", description: "Active members in good standing with a current membership." },
  { key: "pending-verification", name: "Pending Verification", description: "Accounts that have not verified their email address yet." },
  { key: "incomplete-applications", name: "Incomplete Applications", description: "Applications started but never submitted, with no active membership." },
  { key: "expired", name: "Expired Memberships", description: "Members whose membership has expired." },
  { key: "inactive", name: "Inactive Members", description: "Suspended members or members not in good standing." },
]

export type AutomationKey =
  | "article-invite"
  | "event-announcement"
  | "newsletter"
  | "verification-reminder"
  | "incomplete-application"

export type AutomationConfig = {
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
]

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function getAutomation(key: string) {
  return AUTOMATIONS.find((a) => a.key === key)
}

export function describeSchedule(def: AutomationDefinition, config: AutomationConfig) {
  if (def.schedule === "weekly") return `Weekly on ${WEEKDAYS[config.weekday ?? 1]} (09:00 UTC)`
  if (def.schedule === "on-publish") return "When an event is published"
  if (def.key === "verification-reminder") {
    return `Every ${config.intervalDays ?? 3} days, up to ${config.maxReminders ?? 3} reminders`
  }
  const stages = ["24 hours", config.followUp3d ? "3 days" : "", config.followUp7d ? "7 days" : ""].filter(Boolean)
  return `After ${stages.join(", ")} of inactivity`
}

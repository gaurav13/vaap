// Access rules per membership category, keyed by the plan's stored icon so they
// survive title edits in the CMS.
export type PlanAccess = "open" | "invite" | "admin"

export function planAccess(icon: string): PlanAccess {
  if (icon === "GraduationCap") return "invite"
  if (icon === "Landmark") return "admin"
  return "open"
}

export function normalizeInvitationCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "")
}

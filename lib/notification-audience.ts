// Notification audiences. A notification row is either personal (`userId`
// set) or a broadcast to an audience stored in `role`:
//   - "admin" / "staff": internal admin activity (registrations, payments,
//     settings). Only ever shown in the admin panel to those roles.
//   - "community": public community updates (articles, news, events, KOLs,
//     announcements). Shown to every signed-in member.
// Personal rows are private to their owner (own payment, account updates).

export const COMMUNITY_AUDIENCE = "community"

export type NotificationScope = "member" | "admin"

/** Admin-panel audiences a given internal role may read. */
export function adminAudiencesFor(role: string | null | undefined): string[] {
  if (role === "admin") return ["admin", "staff"]
  if (role === "staff") return ["staff"]
  return []
}

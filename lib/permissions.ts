import type { UserRole } from "@/lib/session"

// Central role catalogue. Order roughly reflects privilege for display.
export const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "member", label: "Member", description: "Approved VAAP member" },
  { value: "staff", label: "Staff", description: "VAAP staff member" },
  { value: "committee_head", label: "Committee Head", description: "Leads a sub-committee" },
  { value: "committee_member", label: "Committee Member", description: "Limited committee access" },
  { value: "kol", label: "KOL / Influencer", description: "External referral partner" },
  { value: "admin", label: "Super Admin", description: "Full control" },
]

export const ROLE_LABELS: Record<UserRole, string> = {
  member: "Member",
  staff: "Staff",
  committee_head: "Committee Head",
  committee_member: "Committee Member",
  kol: "KOL / Influencer",
  admin: "Super Admin",
}

// A permission is a coarse capability check used across server actions and UI.
export type Permission =
  | "admin.full"
  | "articles.create"
  | "articles.publish"
  | "committee.view"
  | "committee.manage"
  | "referrals.own"
  | "rewards.own"
  | "payouts.request"
  | "dashboard.staff"

const PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "admin.full",
    "articles.create",
    "articles.publish",
    "committee.view",
    "committee.manage",
    "referrals.own",
    "rewards.own",
    "payouts.request",
    "dashboard.staff",
  ],
  staff: ["articles.create", "referrals.own", "rewards.own", "payouts.request", "dashboard.staff"],
  committee_head: [
    "articles.create",
    "committee.view",
    "committee.manage",
    "referrals.own",
    "rewards.own",
    "payouts.request",
    "dashboard.staff",
  ],
  committee_member: ["committee.view", "referrals.own", "rewards.own", "dashboard.staff"],
  kol: ["referrals.own", "rewards.own"],
  member: [],
}

export function can(role: UserRole | string | null | undefined, permission: Permission): boolean {
  if (!role) return false
  const list = PERMISSIONS[role as UserRole]
  return !!list && list.includes(permission)
}

// Roles that get the internal staff/committee dashboard (sidebar with articles,
// committee, referrals, rewards, payments). KOLs get a lightweight portal only.
export function isStaffDashboardRole(role: UserRole | string | null | undefined): boolean {
  return can(role, "dashboard.staff")
}

// Roles that can own an internal referral code (staff, committee, admin).
export function canOwnReferralCode(role: UserRole | string | null | undefined): boolean {
  return can(role, "referrals.own") && role !== "kol"
}

export function isElevated(role: UserRole | string | null | undefined): boolean {
  return role === "staff" || role === "committee_head" || role === "committee_member" || role === "admin"
}

// Only super admins can review, approve, and pay out referral rewards.
export function canManageRewards(role: UserRole | string | null | undefined): boolean {
  return can(role, "admin.full")
}

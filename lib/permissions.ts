import type { UserRole } from "@/lib/session"

// Central role catalogue. Order roughly reflects privilege for display.
export const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "member", label: "Member", description: "Approved VAAP member" },
  { value: "staff", label: "Staff", description: "VAAP staff member" },
  { value: "committee_head", label: "Committee Head", description: "Leads a sub-committee" },
  { value: "committee_member", label: "Committee Member", description: "Limited committee access" },
  { value: "kol", label: "KOL / Influencer", description: "External referral partner" },
  { value: "manager", label: "Admin", description: "Operational management and approvals" },
  { value: "admin", label: "Super Admin", description: "Full control" },
]

export const ROLE_LABELS: Record<UserRole, string> = {
  member: "Member",
  staff: "Staff Admin",
  committee_head: "Committee Head",
  committee_member: "Committee Member",
  kol: "KOL / Influencer",
  manager: "Admin",
  admin: "Super Admin",
}

export type AdminAreaRole = "admin" | "manager" | "staff"

export function isAdminAreaRole(role: string | null | undefined): role is AdminAreaRole {
  return role === "admin" || role === "manager" || role === "staff"
}

export const ADMIN_AREA_LABELS: Record<AdminAreaRole, string> = {
  admin: "Super Admin",
  manager: "Admin",
  staff: "Staff Admin",
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
  // Governance: only super admins run the governance / election system.
  | "governance.manage"
  // Read-only admin views granted to staff (members, articles, referrals).
  | "admin.view"

// Admin routes a Staff Admin may open. Everything else redirects. Server actions
// enforce the same rules independently (see lib/rbac.ts).
export const STAFF_ADMIN_ROUTES = [
  "/admin/members",
  "/admin/applications",
  "/admin/messages",
  "/admin/events",
  "/admin/participants",
  "/admin/articles",
  "/admin/news",
  "/admin/kols",
  "/admin/activity",
  "/admin/notifications",
] as const

export function isStaffAdminRoute(pathname: string): boolean {
  if (pathname === "/admin" || pathname === "/admin/") return true
  return STAFF_ADMIN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

// Operational Admin: everything Staff can open plus public content modules.
// Never payments, fees, settings, users/roles, invitations or referral finance.
export const MANAGER_ADMIN_ROUTES = [
  ...STAFF_ADMIN_ROUTES,
  "/admin/media-highlights",
  "/admin/pages",
  "/admin/publications",
  "/admin/documents",
  "/admin/leadership",
  "/admin/membership-faqs",
  "/admin/ai-knowledge",
] as const

export function isManagerAdminRoute(pathname: string): boolean {
  if (pathname === "/admin" || pathname === "/admin/") return true
  return MANAGER_ADMIN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

export function canOpenAdminRoute(role: string | null | undefined, pathname: string): boolean {
  if (role === "admin") return true
  if (role === "manager") return isManagerAdminRoute(pathname)
  if (role === "staff") return isStaffAdminRoute(pathname)
  return false
}

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
    "governance.manage",
    "admin.view",
  ],
  manager: [
    "articles.create",
    "articles.publish",
    "committee.view",
    "referrals.own",
    "rewards.own",
    "payouts.request",
    "dashboard.staff",
    "admin.view",
  ],
  staff: ["articles.create", "referrals.own", "rewards.own", "payouts.request", "dashboard.staff", "admin.view"],
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
  return role === "staff" || role === "manager" || role === "committee_head" || role === "committee_member" || role === "admin"
}

// Only super admins can review, approve, and pay out referral rewards.
export function canManageRewards(role: UserRole | string | null | undefined): boolean {
  return can(role, "admin.full")
}

// Only super admins run the governance / election system: create proposals and
// elections, choose eligibility, publish, close, compute results, and anchor to XRPL.
export function canManageGovernance(role: UserRole | string | null | undefined): boolean {
  return can(role, "governance.manage")
}

import { redirect } from "next/navigation"
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CreditCard,
  FileText,
  Plus,
  Trash2,
  History,
  IdCard,
  Inbox,
  Layers,
  Newspaper,
  PenSquare,
  Settings,
  UserCog,
  Users,
} from "lucide-react"
import { count, desc, eq, gte, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { articles, auditLogs, contactMessages, eventRsvps, events, kolProfiles, membershipApplications, news } from "@/lib/db/schema"
import { getMembershipFunnel } from "@/lib/membership-funnel"
import { currentOperator } from "@/lib/rbac"
import { ADMIN_AREA_LABELS, canOpenAdminRoute } from "@/lib/permissions"
import {
  DashboardHero,
  ModuleGrid,
  PendingApprovals,
  QuickActions,
  RecentActivity,
  RevenueBanner,
  StatGrid,
  type ApprovalItem,
  type ModuleCard,
  type QuickAction,
  type StatCard,
} from "@/components/admin/dashboard-widgets"

const v = (rows: { v: number }[]) => Number(rows[0]?.v ?? 0)

function revenueTotals(amounts: (string | null)[]) {
  const byCurrency = new Map<string, number>()
  for (const raw of amounts) {
    if (!raw) continue
    const value = Number(raw.replace(/[^0-9.]/g, ""))
    if (!Number.isFinite(value) || value <= 0) continue
    const currency = /usd|\$/i.test(raw) ? "USD" : "PKR"
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + value)
  }
  return [...byCurrency.entries()]
    .map(([currency, amount]) => ({ currency, amount: Math.round(amount) }))
    .sort((a, b) => (a.currency === "PKR" ? -1 : b.currency === "PKR" ? 1 : 0))
}

function paidTrend(dates: (Date | null)[], days = 30) {
  const start = Date.now() - days * 86400000
  const before = dates.filter((d) => d && new Date(d).getTime() < start).length
  const buckets = Array.from({ length: days }, () => 0)
  for (const d of dates) {
    if (!d) continue
    const idx = Math.floor((new Date(d).getTime() - start) / 86400000)
    if (idx >= 0 && idx < days) buckets[idx]++
  }
  let running = before
  return buckets.map((n) => (running += n))
}

async function loadCounts() {
  const now = new Date()
  const [newsCount, eventCount, upcoming, published, msgsNew, appsPending, rsvpsPending, articlesPending, kolsPending, kolsTotal, rsvpTotal] =
    await Promise.all([
      db.select({ v: count() }).from(news),
      db.select({ v: count() }).from(events),
      db.select({ v: count() }).from(events).where(gte(events.startsAt, now)),
      db.select({ v: count() }).from(articles).where(eq(articles.status, "published")),
      db.select({ v: count() }).from(contactMessages).where(eq(contactMessages.handled, false)),
      db.select({ v: count() }).from(membershipApplications).where(eq(membershipApplications.status, "pending")),
      db.select({ v: count() }).from(eventRsvps).where(eq(eventRsvps.status, "pending")),
      db.select({ v: count() }).from(articles).where(inArray(articles.status, ["pending", "submitted", "under_review"])),
      db.select({ v: count() }).from(kolProfiles).where(inArray(kolProfiles.status, ["pending", "under_review", "info_required"])),
      db.select({ v: count() }).from(kolProfiles),
      db.select({ v: count() }).from(eventRsvps),
    ])
  return {
    news: v(newsCount),
    events: v(eventCount),
    upcoming: v(upcoming),
    published: v(published),
    msgsNew: v(msgsNew),
    appsPending: v(appsPending),
    rsvpsPending: v(rsvpsPending),
    articlesPending: v(articlesPending),
    kolsPending: v(kolsPending),
    kols: v(kolsTotal),
    rsvps: v(rsvpTotal),
  }
}

async function loadActivity(actorId: string | null) {
  const rows = await db
    .select({ id: auditLogs.id, action: auditLogs.action, target: auditLogs.target, actor: auditLogs.actorName, at: auditLogs.createdAt })
    .from(auditLogs)
    .where(actorId ? eq(auditLogs.actorId, actorId) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(6)
  return rows
}

export default async function AdminOverview() {
  const actor = await currentOperator()
  if (!actor) redirect("/sign-in")
  const role = actor.role
  const isSuper = role === "admin"

  // Staff only see their own actions in the feed; Admin and Super Admin see everyone's.
  const [c, funnel, activity] = await Promise.all([
    loadCounts(),
    getMembershipFunnel(),
    loadActivity(role === "staff" ? actor.id : null),
  ])
  const paidMembers = funnel.paid.filter((p) => p.status === "active").length
  const totalMembers = funnel.stats.totalRegistered
  const pendingPayments = funnel.stats.pendingPayments

  const stats: StatCard[] = isSuper ? [
    { label: "Total Members", value: totalMembers, hint: `${paidMembers} paid`, href: "/admin/members", icon: Users, tone: "green" },
    isSuper
      ? { label: "Paid Members", value: paidMembers, hint: `${totalMembers ? Math.round((paidMembers / totalMembers) * 100) : 0}% of members`, href: "/admin/membership-funnel", icon: Layers, tone: "teal" }
      : { label: "Active Events", value: c.events, hint: `${c.upcoming} upcoming`, href: "/admin/events", icon: CalendarDays, tone: "teal" },
    { label: "Pending Payments", value: pendingPayments, hint: "Payment pending", hintTone: "warn", href: "/admin/applications", icon: CreditCard, tone: "amber" },
    isSuper
      ? { label: "Pending Approvals", value: c.appsPending + c.rsvpsPending + c.articlesPending + c.kolsPending, href: "/admin/applications", icon: History, tone: "indigo" }
      : { label: "Published Articles", value: c.published, hint: `${c.articlesPending} awaiting review`, href: "/admin/articles", icon: PenSquare, tone: "indigo" },
  ] : [
    { label: "Total Members", value: totalMembers, hint: `${paidMembers} paid`, href: "/admin/members", icon: Users, tone: "green" },
    { label: "Pending (Unpaid)", value: pendingPayments, hint: "Payment Pending", hintTone: "warn", href: "/admin/applications", icon: FileText, tone: "amber" },
    { label: "Active Events", value: c.events, hint: `${c.upcoming} upcoming`, href: "/admin/events", icon: CalendarDays, tone: "green" },
    { label: "Published Articles", value: c.published, hint: `${c.articlesPending} awaiting review`, href: "/admin/articles", icon: Newspaper, tone: "green" },
  ]

  const UNITS: Record<string, string> = {
    "/admin/members": "Total",
    "/admin/applications": "Pending",
    "/admin/messages": "New",
    "/admin/events": "Events",
    "/admin/participants": "Requests",
    "/admin/articles": "Pending",
    "/admin/news": "Posts",
    "/admin/kols": "Profiles",
  }

  const allModules: ModuleCard[] = [
    { label: "Memberships", description: "Members, applications and payment status.", href: "/admin/members", tone: "green", icon: IdCard, count: totalMembers },
    { label: "Applications", description: "Review and approve paid applications.", href: "/admin/applications", tone: "teal", icon: FileText, count: c.appsPending },
    { label: "Messages & Inquiries", description: "Reply to website inquiries.", href: "/admin/messages", tone: "teal", icon: Inbox, count: c.msgsNew },
    { label: "Events", description: "Create, review and approve events.", href: "/admin/events", tone: "indigo", icon: CalendarDays, count: c.events },
    { label: "Event Participants", description: "Approve event registrations.", href: "/admin/participants", tone: "green", icon: Users, count: c.rsvps },
    { label: "Articles", description: "Review, edit and publish member articles.", href: "/admin/articles", tone: "teal", icon: PenSquare, count: c.articlesPending },
    { label: "News", description: "Publish news and announcements.", href: "/admin/news", tone: "teal", icon: Newspaper, count: c.news },
    { label: "Verified KOLs", description: "Review and manage KOL profiles.", href: "/admin/kols", tone: "green", icon: BadgeCheck, count: c.kols },
    { label: "Content Management", description: "Website pages, sections and media.", href: "/admin/pages", tone: "indigo", icon: Layers },
    { label: "Users & Roles", description: "Assign Staff, Admin and Super Admin roles.", href: "/admin/users", tone: "green", icon: UserCog },
    { label: "Website Settings", description: "General, SEO and integration settings.", href: "/admin/settings", tone: "teal", icon: Settings },
    { label: "Payments", description: "Crypto payments and transactions.", href: "/admin/payments", tone: "amber", icon: CreditCard },
    { label: "Reports", description: "Membership and engagement reports.", href: "/admin/reports", tone: "indigo", icon: BarChart3 },
    { label: "Activity & Restore", description: "Audit every action and restore edits.", href: "/admin/activity", tone: "indigo", icon: History },
  ]
  const modules = allModules
    .filter((m) => canOpenAdminRoute(role, m.href))
    .map((m) => (isSuper ? { ...m, count: undefined } : { ...m, unit: UNITS[m.href] }))

  const quickActions = (
    isSuper
      ? [
          { label: "Add Member", href: "/admin/members", icon: Plus, tone: "green" },
          { label: "Create Event", href: "/admin/events", icon: CalendarDays, tone: "indigo" },
          { label: "Publish Article", href: "/admin/news", icon: FileText, tone: "teal" },
          { label: "Verify KOL", href: "/admin/kols", icon: BadgeCheck, tone: "green" },
          { label: "Manage Payments", href: "/admin/payments", icon: CreditCard, tone: "amber" },
          { label: "Delete Records", href: "/admin/activity", icon: Trash2, tone: "danger" },
        ]
      : [
          { label: "Review Memberships", href: "/admin/applications", icon: Users, tone: "green" },
          { label: "Approve Events", href: "/admin/events", icon: CalendarDays, tone: "indigo" },
          { label: "Approve Articles", href: "/admin/articles", icon: PenSquare, tone: "teal" },
          { label: "Edit KOL Profiles", href: "/admin/kols", icon: BadgeCheck, tone: "green" },
          { label: "Reply to Messages", href: "/admin/messages", icon: Inbox, tone: "teal" },
        ]
  ) as QuickAction[]
  const visibleActions = quickActions.filter((a) => canOpenAdminRoute(role, a.href))

  const approvals: ApprovalItem[] = [
    { label: "Membership Applications", count: c.appsPending, href: "/admin/applications", icon: Users, tone: "green" as const },
    { label: "Event Participation Requests", count: c.rsvpsPending, href: "/admin/participants", icon: CalendarDays, tone: "indigo" as const },
    { label: "Article Submissions", count: c.articlesPending, href: "/admin/articles", icon: PenSquare, tone: "teal" as const },
    { label: "KOL Verification Requests", count: c.kolsPending, href: "/admin/kols", icon: BadgeCheck, tone: "green" as const },
  ].filter((a) => a.count > 0 && canOpenAdminRoute(role, a.href))

  const title = isSuper ? "Super Admin Dashboard" : `Welcome, ${actor.name || ADMIN_AREA_LABELS[role]}`
  const subtitle = isSuper
    ? "Full control and management of the VAAP platform."
    : `VAAP ${ADMIN_AREA_LABELS[role]} Dashboard – Manage members, content, events and community operations.`

  return (
    <div className="flex flex-col gap-6">
      <DashboardHero title={title} subtitle={subtitle} />

      <StatGrid stats={stats} labelFirst={!isSuper} />

      {!isSuper && (
        <>
          <QuickActions actions={visibleActions} bar />
          <ModuleGrid modules={modules} columns={3} />
          <div className="grid gap-4 lg:grid-cols-2">
            <RecentActivity items={activity} viewAllHref={canOpenAdminRoute(role, "/admin/activity") ? "/admin/activity" : undefined} />
            <PendingApprovals items={approvals} />
          </div>
        </>
      )}

      {isSuper && (
        <>
      <RevenueBanner
          totals={revenueTotals(funnel.paid.map((p) => p.amount))}
          paidMembers={paidMembers}
          pendingPayments={pendingPayments}
          trend={paidTrend(funnel.paid.map((p) => p.paymentDate))}
        />

      <ModuleGrid modules={modules} />

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <QuickActions actions={visibleActions} />
        <RecentActivity items={activity} viewAllHref={canOpenAdminRoute(role, "/admin/activity") ? "/admin/activity" : undefined} />
        <PendingApprovals items={approvals} />
      </div>
        </>
      )}
    </div>
  )
}

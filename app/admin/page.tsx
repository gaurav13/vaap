import { redirect } from "next/navigation"
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CreditCard,
  FileText,
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
  ModuleGrid,
  PendingApprovals,
  QuickActions,
  RecentActivity,
  RevenueBanner,
  StatGrid,
  type ApprovalItem,
  type ModuleCard,
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

  const stats: StatCard[] = [
    { label: "Total members", value: totalMembers, hint: `${paidMembers} paid`, href: "/admin/members", icon: Users },
    { label: "Pending (unpaid)", value: pendingPayments, hint: "Payment pending", href: "/admin/applications", icon: CreditCard },
    { label: "Events", value: c.events, hint: `${c.upcoming} upcoming`, href: "/admin/events", icon: CalendarDays },
    { label: "Published articles", value: c.published, hint: `${c.articlesPending} awaiting review`, href: "/admin/articles", icon: PenSquare },
  ]

  const allModules: ModuleCard[] = [
    { label: "Memberships", description: "Members, applications and payment status.", href: "/admin/members", icon: IdCard, count: totalMembers },
    { label: "Applications", description: "Review and approve paid applications.", href: "/admin/applications", icon: FileText, count: c.appsPending },
    { label: "Messages & Inquiries", description: "Reply to website inquiries.", href: "/admin/messages", icon: Inbox, count: c.msgsNew },
    { label: "Events", description: "Create, review and approve events.", href: "/admin/events", icon: CalendarDays, count: c.events },
    { label: "Event Participants", description: "Approve event registrations.", href: "/admin/participants", icon: Users, count: c.rsvps },
    { label: "Articles", description: "Review, edit and publish member articles.", href: "/admin/articles", icon: PenSquare, count: c.articlesPending },
    { label: "News", description: "Publish news and announcements.", href: "/admin/news", icon: Newspaper, count: c.news },
    { label: "Verified KOLs", description: "Review and manage KOL profiles.", href: "/admin/kols", icon: BadgeCheck, count: c.kols },
    { label: "Content Management", description: "Website pages, sections and media.", href: "/admin/pages", icon: Layers },
    { label: "Users & Roles", description: "Assign Staff, Admin and Super Admin roles.", href: "/admin/users", icon: UserCog },
    { label: "Website Settings", description: "General, SEO and integration settings.", href: "/admin/settings", icon: Settings },
    { label: "Payments", description: "Crypto payments and transactions.", href: "/admin/payments", icon: CreditCard },
    { label: "Reports", description: "Membership and engagement reports.", href: "/admin/reports", icon: BarChart3 },
    { label: "Activity & Restore", description: "Audit every action and restore edits.", href: "/admin/activity", icon: History },
  ]
  const modules = allModules.filter((m) => canOpenAdminRoute(role, m.href))

  const quickActions = [
    { label: "Review memberships", href: "/admin/applications", icon: Users },
    { label: "Approve events", href: "/admin/events", icon: CalendarDays },
    { label: "Approve articles", href: "/admin/articles", icon: PenSquare },
    { label: "KOL profiles", href: "/admin/kols", icon: BadgeCheck },
    { label: "Reply to messages", href: "/admin/messages", icon: Inbox },
  ].filter((a) => canOpenAdminRoute(role, a.href))

  const approvals: ApprovalItem[] = [
    { label: "Membership applications", count: c.appsPending, href: "/admin/applications", icon: Users },
    { label: "Event participation requests", count: c.rsvpsPending, href: "/admin/participants", icon: CalendarDays },
    { label: "Article submissions", count: c.articlesPending, href: "/admin/articles", icon: PenSquare },
    { label: "KOL verification requests", count: c.kolsPending, href: "/admin/kols", icon: BadgeCheck },
  ].filter((a) => a.count > 0 && canOpenAdminRoute(role, a.href))

  const title = isSuper ? "Super Admin Dashboard" : `Welcome, ${actor.name || ADMIN_AREA_LABELS[role]}`
  const subtitle = isSuper
    ? "Full control and management of the VAAP platform."
    : role === "manager"
      ? "Manage members, content, events and community operations."
      : "Review applications, events, articles and messages."

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-balance font-serif text-2xl font-bold text-heading">{title}</h1>
        <p className="mt-1 text-muted-2">{subtitle}</p>
      </header>

      <StatGrid stats={stats} />

      {isSuper && <RevenueBanner totals={revenueTotals(funnel.paid.map((p) => p.amount))} paidMembers={paidMembers} pendingPayments={pendingPayments} />}

      <QuickActions actions={quickActions} />

      <ModuleGrid modules={modules} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentActivity items={activity} viewAllHref={canOpenAdminRoute(role, "/admin/activity") ? "/admin/activity" : undefined} />
        <PendingApprovals items={approvals} />
      </div>
    </div>
  )
}

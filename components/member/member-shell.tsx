"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import {
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronDown,
  Compass,
  ExternalLink,
  FileCheck2,
  FileText,
  Home,
  IdCard,
  LifeBuoy,
  Lightbulb,
  LogOut,
  Menu,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  PenSquare,
  Settings,
  ShieldCheck,
  Share2,
  User,
  UserCog,
  Vote,
  X,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { can, canOwnReferralCode, isElevated } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { VaapLogo } from "@/components/vaap-logo"
import { NotificationBell, type NotificationItem } from "@/components/member/notification-bell"

type NavLink = { label: string; href: string; icon: typeof Home }
type NavEntry =
  | ({ kind: "link" } & NavLink)
  | { kind: "group"; id: string; label: string; icon: typeof Home; items: NavLink[] }

const NAV: NavEntry[] = [
  { kind: "link", label: "Dashboard", href: "/dashboard", icon: Home },
  {
    kind: "group",
    id: "membership",
    label: "Membership",
    icon: IdCard,
    items: [
      { label: "My Profile", href: "/dashboard/profile", icon: User },
      { label: "My Position", href: "/dashboard/position", icon: Award },
      { label: "KOL Verification", href: "/dashboard/kol", icon: BadgeCheck },
      { label: "My Membership", href: "/dashboard/membership", icon: IdCard },
      { label: "Voting Status", href: "/dashboard/voting", icon: ShieldCheck },
      { label: "Governance Voting", href: "/dashboard/governance", icon: Vote },
      { label: "My Applications", href: "/dashboard/applications", icon: FileCheck2 },
      { label: "Elections", href: "/dashboard/elections", icon: Vote },
    ],
  },
  {
    kind: "group",
    id: "explore",
    label: "Explore",
    icon: Compass,
    items: [
      { label: "Knowledge", href: "/dashboard/knowledge", icon: Lightbulb },
      { label: "Resources", href: "/dashboard/resources", icon: BookOpen },
      { label: "Opportunities", href: "/dashboard/opportunities", icon: Briefcase },
    ],
  },
  { kind: "link", label: "My Referrals", href: "/dashboard/referrals", icon: Share2 },
  {
    kind: "group",
    id: "content",
    label: "Content & Events",
    icon: Newspaper,
    items: [
      { label: "Event Submission", href: "/dashboard/events", icon: CalendarDays },
      { label: "Article Submission", href: "/dashboard/articles", icon: PenSquare },
    ],
  },
  {
    kind: "group",
    id: "account",
    label: "Account",
    icon: UserCog,
    items: [
      { label: "Documents", href: "/dashboard/documents", icon: FileText },
      { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
]

const MOBILE_NAV: NavLink[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Events", href: "/dashboard/events", icon: CalendarDays },
  { label: "Knowledge", href: "/dashboard/knowledge", icon: Lightbulb },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { label: "Profile", href: "/dashboard/profile", icon: User },
]

const COLLAPSE_STORAGE_KEY = "vaap.member-sidebar.collapsed"

export type MemberUser = {
  name: string
  email: string
  role: "member" | "staff" | "committee_head" | "committee_member" | "kol" | "admin"
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(href + "/")
}

function isVisible(href: string, role: MemberUser["role"]) {
  if (href === "/dashboard/referrals") return canOwnReferralCode(role)
  if (href === "/dashboard/position") return isElevated(role)
  if (href === "/dashboard/articles") return can(role, "articles.create")
  return true
}

export function MemberShell({
  user,
  notifications = [],
  children,
}: {
  user: MemberUser
  notifications?: NotificationItem[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1")
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0")
      return next
    })
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-card transition-[width] duration-200 lg:flex",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <SidebarContent
          pathname={pathname}
          role={user.role}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setDrawerOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <VaapLogo height={40} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="flex size-9 items-center justify-center rounded-md text-navy hover:bg-mint"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarContent pathname={pathname} role={user.role} collapsed={false} hideHeader />
          </aside>
        </div>
      )}

      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-20" : "lg:pl-64")}>
        <Topbar user={user} notifications={notifications} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>

      <MobileTabBar pathname={pathname} />
    </div>
  )
}

function SidebarContent({
  pathname,
  role,
  collapsed,
  onToggleCollapsed,
  hideHeader,
}: {
  pathname: string
  role: MemberUser["role"]
  collapsed: boolean
  onToggleCollapsed?: () => void
  hideHeader?: boolean
}) {
  const router = useRouter()
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({})

  const entries = NAV.flatMap<NavEntry>((entry) => {
    if (entry.kind === "link") return isVisible(entry.href, role) ? [entry] : []
    const items = entry.items.filter((item) => isVisible(item.href, role))
    return items.length > 0 ? [{ ...entry, items }] : []
  })

  function toggleGroup(id: string) {
    setClosedGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function signOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!hideHeader && (
        <div
          className={cn(
            "flex h-[73px] shrink-0 items-center border-b border-line",
            collapsed ? "justify-center px-2" : "justify-between gap-2 pl-6 pr-3",
          )}
        >
          {!collapsed && (
            <Link href="/dashboard" className="min-w-0">
              <VaapLogo height={44} />
              <span className="sr-only">VAAP member dashboard</span>
            </Link>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-mint hover:text-navy"
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
        </div>
      )}

      <nav aria-label="Member dashboard" className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        <ul className="flex flex-col gap-0.5">
          {entries.map((entry) => {
            if (entry.kind === "link") {
              return (
                <li key={entry.href}>
                  <SidebarLink item={entry} active={isActive(pathname, entry.href)} collapsed={collapsed} />
                </li>
              )
            }

            const GroupIcon = entry.icon
            const groupActive = entry.items.some((item) => isActive(pathname, item.href))
            const open = collapsed || groupActive || !closedGroups[entry.id]
            const panelId = `member-nav-${entry.id}`

            return (
              <li key={entry.id} className={cn(collapsed ? "mt-2 border-t border-line pt-2" : "mt-1")}>
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(entry.id)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-mint hover:text-navy",
                      groupActive ? "text-navy" : "text-body",
                    )}
                  >
                    <GroupIcon className={cn("size-[18px] shrink-0", groupActive ? "text-green" : "text-muted-2")} />
                    <span className="flex-1 truncate text-left">{entry.label}</span>
                    <ChevronDown
                      className={cn("size-4 shrink-0 text-muted-2 transition-transform", open ? "rotate-0" : "-rotate-90")}
                    />
                  </button>
                )}
                {collapsed && <span className="sr-only">{entry.label}</span>}

                {open && (
                  <ul
                    id={panelId}
                    className={cn("flex flex-col gap-0.5", !collapsed && "ml-[21px] mt-0.5 border-l border-line pl-2")}
                  >
                    {entry.items.map((item) => (
                      <li key={item.href}>
                        <SidebarLink item={item} active={isActive(pathname, item.href)} collapsed={collapsed} nested />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>

        <div className="my-4 border-t border-line" />
        <button
          type="button"
          onClick={signOut}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-body transition-colors hover:bg-destructive/10 hover:text-destructive",
            collapsed ? "justify-center px-0" : "px-3",
          )}
        >
          <LogOut className="size-[18px] shrink-0" />
          <span className={cn(collapsed && "sr-only")}>Logout</span>
        </button>
      </nav>

      {!collapsed && (
        <div className="border-t border-line px-6 py-5">
          <p className="text-xs font-bold leading-5 tracking-wide text-heading">
            PEOPLE.
            <br />
            INDUSTRY.
            <br />
            INNOVATION.
          </p>
          <p className="mt-2 text-xs font-semibold text-green">A STRONGER DIGITAL PAKISTAN.</p>
          <span className="mt-3 block h-1 w-10 rounded-full bg-green/40" />
        </div>
      )}
    </div>
  )
}

function SidebarLink({
  item,
  active,
  collapsed,
  nested,
}: {
  item: NavLink
  active: boolean
  collapsed: boolean
  nested?: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0 py-2.5" : nested ? "px-3 py-2" : "px-3 py-2.5",
        active ? "bg-green text-white shadow-sm" : "text-body hover:bg-mint hover:text-navy",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active ? "text-white" : "text-muted-2")} />
      <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
    </Link>
  )
}

function Topbar({
  user,
  notifications,
  onOpenMenu,
}: {
  user: MemberUser
  notifications: NotificationItem[]
  onOpenMenu: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const roleLabel = user.role === "admin" ? "Administrator" : user.role === "staff" ? "Staff" : "Member"

  async function signOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-[73px] items-center justify-between gap-3 border-b border-line bg-card/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onOpenMenu}
          className="flex size-10 items-center justify-center rounded-md text-navy hover:bg-mint lg:hidden"
        >
          <Menu className="size-6" />
        </button>
        <Link href="/dashboard" className="lg:hidden">
          <VaapLogo height={36} />
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-green px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green/90"
        >
          <ExternalLink className="size-4" />
          <span className="hidden sm:inline">Visit Website</span>
        </Link>

        <NotificationBell initial={notifications} />

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2 text-left transition-colors hover:bg-mint"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-green text-sm font-bold text-white">
              {initials || "V"}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-bold text-heading">{user.name}</span>
              <span className="block text-xs text-muted-2">{roleLabel}</span>
            </span>
            <ChevronDown className="size-4 text-muted-2" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
              <div className="border-b border-line px-4 py-3">
                <p className="truncate text-sm font-semibold text-heading">{user.name}</p>
                <p className="truncate text-xs text-muted-2">{user.email}</p>
              </div>
              <div className="flex flex-col p-1.5">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-body transition-colors hover:bg-mint hover:text-navy"
                >
                  <User className="size-4" /> My Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-body transition-colors hover:bg-mint hover:text-navy"
                >
                  <Settings className="size-4" /> Settings
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-body transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MobileTabBar({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-card lg:hidden">
      {MOBILE_NAV.map((item) => {
        const active = isActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              active ? "text-green" : "text-muted-2",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

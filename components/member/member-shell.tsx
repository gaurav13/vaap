"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import {
  Award,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronDown,
  FileCheck2,
  FileText,
  Home,
  IdCard,
  LifeBuoy,
  LogOut,
  Menu,
  PenSquare,
  Settings,
  ShieldCheck,
  Share2,
  User,
  X,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { canOwnReferralCode, isElevated } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { VaapLogo } from "@/components/vaap-logo"

type NavItem = { label: string; href: string; icon: typeof Home; group?: string }

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "My Profile", href: "/dashboard/profile", icon: User, group: "Membership" },
  { label: "My Position", href: "/dashboard/position", icon: Award },
  { label: "Membership", href: "/dashboard/membership", icon: IdCard },
  { label: "Voting Status", href: "/dashboard/voting", icon: ShieldCheck },
  { label: "My Applications", href: "/dashboard/applications", icon: FileCheck2 },
  { label: "Events", href: "/dashboard/events", icon: CalendarDays, group: "Explore" },
  { label: "Knowledge & Resources", href: "/dashboard/resources", icon: BookOpen },
  { label: "Opportunities", href: "/dashboard/opportunities", icon: Briefcase },
  { label: "Referrals & Rewards", href: "/dashboard/referrals", icon: Share2 },
  { label: "Articles", href: "/dashboard/articles", icon: PenSquare },
  { label: "Documents", href: "/dashboard/documents", icon: FileText },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy, group: "Account" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

const MOBILE_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Events", href: "/dashboard/events", icon: CalendarDays },
  { label: "Resources", href: "/dashboard/resources", icon: BookOpen },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { label: "Profile", href: "/dashboard/profile", icon: User },
]

export type MemberUser = {
  name: string
  email: string
  role: "member" | "staff" | "committee_head" | "committee_member" | "kol" | "admin"
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(href + "/")
}

export function MemberShell({ user, children }: { user: MemberUser; children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-card lg:flex">
        <SidebarContent pathname={pathname} role={user.role} />
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
            <SidebarContent pathname={pathname} role={user.role} hideLogo />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <Topbar user={user} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>

      <MobileTabBar pathname={pathname} />
    </div>
  )
}

function SidebarContent({
  pathname,
  role,
  hideLogo,
}: {
  pathname: string
  role: MemberUser["role"]
  hideLogo?: boolean
}) {
  const router = useRouter()

  const navItems = NAV.filter((item) => {
    if (item.href === "/dashboard/referrals") return canOwnReferralCode(role)
    if (item.href === "/dashboard/position") return isElevated(role)
    return true
  })

  async function signOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!hideLogo && (
        <div className="flex h-[73px] items-center border-b border-line px-6">
          <Link href="/dashboard">
            <VaapLogo height={44} />
            <span className="sr-only">VAAP member dashboard</span>
          </Link>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                {item.group && (
                  <p className="px-3 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-2/70">
                    {item.group}
                  </p>
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-green text-white shadow-sm" : "text-body hover:bg-mint hover:text-navy",
                  )}
                >
                  <Icon className={cn("size-[18px] shrink-0", active ? "text-white" : "text-muted-2")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="my-4 border-t border-line" />
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-body transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-[18px] shrink-0" /> Logout
        </button>
      </nav>

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
    </div>
  )
}

function Topbar({ user, onOpenMenu }: { user: MemberUser; onOpenMenu: () => void }) {
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
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-10 items-center justify-center rounded-full text-body transition-colors hover:bg-mint hover:text-navy"
        >
          <Bell className="size-5" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-destructive ring-2 ring-card" />
        </button>

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

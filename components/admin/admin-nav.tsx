"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import {
  Award,
  BookOpen,
  CalendarDays,
  Coins,
  FileText,
  FolderOpen,
  Handshake,
  HelpCircle,
  Home,
  IdCard,
  Inbox,
  Share2,
  Wallet,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Map,
  Newspaper,
  Percent,
  PenSquare,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  Vote,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { VaapLogo } from "@/components/vaap-logo"
import { authClient } from "@/lib/auth-client"

const GROUPS: { heading: string; links: { href: string; label: string; icon: typeof Home; adminOnly?: boolean }[] }[] = [
  {
    heading: "Overview",
    links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Content",
    links: [
      { href: "/admin/pages", label: "Pages", icon: LayoutTemplate },
      { href: "/admin/news", label: "News", icon: Newspaper },
    { href: "/admin/articles", label: "Articles", icon: PenSquare },
      { href: "/admin/events", label: "Events", icon: CalendarDays },
      { href: "/admin/publications", label: "Publications", icon: BookOpen },
      { href: "/admin/documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    heading: "Organization",
    links: [
      { href: "/admin/leadership", label: "Leadership", icon: Award },
      { href: "/admin/staff", label: "Team & Staff", icon: UsersRound, adminOnly: true },
      { href: "/admin/committees", label: "Committees", icon: UsersRound },
      { href: "/admin/partners", label: "Partners", icon: Handshake },
      { href: "/admin/official-status", label: "Official Status", icon: Award },
    ],
  },
  {
    heading: "Community",
    links: [
      { href: "/admin/members", label: "Members", icon: IdCard },
      { href: "/admin/membership-plans", label: "Membership Plans", icon: Wallet },
      { href: "/admin/membership-faqs", label: "Membership FAQs", icon: HelpCircle },
      { href: "/admin/applications", label: "Applications", icon: FileText },
      { href: "/admin/messages", label: "Messages", icon: Inbox },
      { href: "/admin/users", label: "Users & Roles", icon: Users, adminOnly: true },
    ],
  },
  {
    heading: "Governance",
    links: [
 { href: "/admin/governance", label: "Proposals & Voting", icon: Vote },
 { href: "/admin/elections", label: "Elections", icon: Vote },
 { href: "/admin/governance/voting-rights", label: "Voting Approvals", icon: ShieldCheck, adminOnly: true },
 { href: "/admin/governance/reports", label: "Reports & Audit", icon: FileText },
    ],
  },
  {
    heading: "Referrals & Rewards",
    links: [
      { href: "/admin/referrals", label: "Referral Console", icon: Share2, adminOnly: true },
      { href: "/admin/commissions", label: "Commission & Rewards", icon: Percent, adminOnly: true },
      { href: "/admin/rewards", label: "Rewards & Payouts", icon: Coins, adminOnly: true },
    ],
  },
  {
    heading: "Settings",
    links: [
      { href: "/admin/sitemap", label: "Sitemap", icon: Map },
      { href: "/admin/settings", label: "Website Settings", icon: Settings, adminOnly: true },
    ],
  },
]

export function AdminNav({ role, name }: { role: "staff" | "admin"; name: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <aside className="flex shrink-0 flex-col border-b border-line bg-navy text-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:border-navy/40">
      <div className="flex items-center justify-between px-5 py-5 lg:block">
        <Link href="/">
          <VaapLogo onDark height={52} />
        </Link>
        <span className="mt-1 hidden text-xs text-white/60 lg:block">Administration</span>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-3 lg:py-2">
        {GROUPS.map((group) => {
          const links = group.links.filter((l) => !l.adminOnly || role === "admin")
          if (links.length === 0) return null
          return (
            <div key={group.heading} className="flex gap-1 lg:mt-3 lg:flex-col lg:gap-0.5 lg:first:mt-0">
              <span className="hidden px-3.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40 lg:block">
                {group.heading}
              </span>
              {links.map((l) => {
                const active = pathname === l.href
                const Icon = l.icon
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-green text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="size-4" />
                    {l.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="mt-auto hidden flex-col gap-1 border-t border-white/10 p-3 lg:flex">
        <div className="px-3.5 py-2">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          <span className="text-[10px] font-bold uppercase tracking-wide text-green-light">{role}</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Home className="size-4" /> View site
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </aside>
  )
}

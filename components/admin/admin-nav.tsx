"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import {
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Clapperboard,
  Coins,
  Crown,
  ExternalLink,
  Globe,
  FileText,
  FolderOpen,
  Handshake,
  HelpCircle,
  Home,
  IdCard,
  Inbox,
  KeyRound,
  Share2,
  Wallet,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  Map,
  Newspaper,
  Percent,
  PenSquare,
  Search,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  Vote,
  Tv,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { VaapLogo } from "@/components/vaap-logo"
import { authClient } from "@/lib/auth-client"
import { ADMIN_AREA_LABELS, canOpenAdminRoute, type AdminAreaRole } from "@/lib/permissions"

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
      { href: "/admin/participants", label: "Event Participants", icon: Users },
      { href: "/admin/media-highlights", label: "Media Highlights", icon: Clapperboard },
      { href: "/admin/media-coverage", label: "As Seen On (TV & Media)", icon: Tv },
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
      { href: "/admin/membership-funnel", label: "Registered vs Paid", icon: Users, adminOnly: true },
      { href: "/admin/membership-plans", label: "Membership Plans", icon: Wallet },
      { href: "/admin/membership-faqs", label: "Membership FAQs", icon: HelpCircle },
      { href: "/admin/ai", label: "AI Assistant Admin", icon: LayoutDashboard },
      { href: "/admin/ai-knowledge", label: "AI Knowledge Center", icon: BookOpen },
      { href: "/admin/social-agent", label: "AI Social Media Agent", icon: Share2, adminOnly: true },
      { href: "/admin/applications", label: "Applications", icon: FileText },
      { href: "/admin/invitations", label: "Invitations & Enrolment", icon: KeyRound, adminOnly: true },
      { href: "/admin/kols", label: "KOL Verification", icon: BadgeCheck },
      { href: "/admin/messages", label: "Messages", icon: Inbox },
      { href: "/admin/reports", label: "Reports", icon: ShieldCheck, adminOnly: true },
      { href: "/admin/users", label: "Users & Roles", icon: Users, adminOnly: true },
      { href: "/admin/activity", label: "Activity & Restore", icon: ShieldCheck, adminOnly: true },
    ],
  },
  {
    heading: "Governance",
    links: [
 { href: "/admin/governance", label: "Proposals & Voting", icon: Vote },
 { href: "/admin/elections", label: "Elections", icon: Vote },
 { href: "/admin/governance/voting-rights", label: "Voting Approvals", icon: ShieldCheck, adminOnly: true },
 { href: "/admin/governance/reports", label: "Reports & Audit", icon: FileText },
 { href: "/admin/governance/xrpl-setup", label: "XRPL Setup", icon: ShieldCheck, adminOnly: true },
    ],
  },
  {
    heading: "Referrals & Rewards",
    links: [
      { href: "/admin/referrals", label: "Referral Console", icon: Share2 },
      { href: "/admin/commissions", label: "Commission & Rewards", icon: Percent, adminOnly: true },
      { href: "/admin/rewards", label: "Rewards & Payouts", icon: Coins, adminOnly: true },
      { href: "/admin/payments", label: "Crypto Payments", icon: Wallet, adminOnly: true },
    ],
  },
  {
    heading: "Settings",
    links: [
      { href: "/admin/emails", label: "Email Templates", icon: Mail, adminOnly: true },
      { href: "/admin/seo", label: "SEO", icon: Search },
      { href: "/admin/sitemap", label: "Sitemap", icon: Map },
      { href: "/admin/settings", label: "Website Settings", icon: Settings, adminOnly: true },
    ],
  },
]

export function AdminNav({ role, name }: { role: AdminAreaRole; name: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <aside className="flex shrink-0 flex-col border-b border-line bg-navy-dark text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:overflow-y-auto lg:border-b-0">
      <div className="flex items-center justify-between gap-3 px-5 py-5 lg:flex-col lg:items-stretch">
        <Link href="/" className="flex items-center justify-center rounded-2xl bg-card px-4 py-3 shadow-sm">
          <VaapLogo height={44} />
        </Link>
  {role === "admin" ? (
  <span className="inline-flex items-center justify-center gap-1.5 self-center rounded-full bg-green px-4 py-1.5 text-sm font-semibold text-primary-foreground">
  <Crown className="size-4 text-gold-tint" aria-hidden />
  {ADMIN_AREA_LABELS[role]}
  </span>
  ) : (
  <div className="hidden items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 lg:flex">
  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green text-primary-foreground">
  <ShieldCheck className="size-5" aria-hidden />
  </span>
  <div className="min-w-0">
  <p className="truncate text-sm font-semibold text-white">{ADMIN_AREA_LABELS[role]}</p>
  <p className="text-xs text-white/70">Operational Access</p>
  </div>
  </div>
  )}
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-3 lg:py-2">
        {GROUPS.map((group) => {
          const links = group.links.filter((l) => canOpenAdminRoute(role, l.href))
          if (links.length === 0) return null
          return (
            <div key={group.heading} className="flex gap-1 lg:mt-3 lg:flex-col lg:gap-0.5 lg:first:mt-0">
              <span className="hidden px-3.5 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wider text-white/50 lg:block">
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
                      "flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-green font-semibold text-white shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden />
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
          <span className="text-[10px] font-bold uppercase tracking-wide text-green-light">{ADMIN_AREA_LABELS[role]}</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl border border-white/20 px-3.5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          <Globe className="size-4" aria-hidden /> View Website <ExternalLink className="ml-auto size-3.5" aria-hidden />
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

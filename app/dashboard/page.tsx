import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Handshake,
  IdCard,
  Lightbulb,
  RefreshCw,
  Rocket,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { getMyMembership } from "@/app/actions/cms"
import { getPublishedNews, getPublishedEvents } from "@/app/actions/public"
import { MISSION_QUOTE, MISSION_TAGLINE, OPPORTUNITIES } from "@/lib/member/content"
import { effectiveExpiry } from "@/lib/membership"
import { MembershipCta } from "@/components/member/membership-cta"

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const OPP_ICONS = { rocket: Rocket, handshake: Handshake, insights: Lightbulb }

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const user = session.user
  if (user.role === "admin" || user.role === "staff") redirect("/admin")
  const firstName = (user.name ?? "Member").split(" ")[0]

  const [membership, news, events] = await Promise.all([
    getMyMembership(user.id),
    getPublishedNews(3),
    getPublishedEvents(2),
  ])

  const memberId = membership?.membershipId ?? "Pending assignment"
  const category = membership?.category ? `${membership.category} Member` : "Membership under review"
  const isActive = membership?.status === "active"
  const validExpiry = isActive ? effectiveExpiry(membership?.joinedAt, membership?.expiresAt) : null
  const validTill = validExpiry ? fmtDate(validExpiry) : null
  const votingEligible = membership?.votingEligible ?? false

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Welcome hero */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-card">
        <div className="absolute inset-0">
          <Image
            src="/member-hero.png"
            alt=""
            fill
            priority
            className="object-cover object-right opacity-70"
            sizes="(max-width: 1024px) 100vw, 1152px"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-transparent" />
        </div>
        <div className="relative flex flex-col gap-4 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-2">Welcome Back,</p>
            <h1 className="mt-0.5 font-serif text-3xl font-bold text-heading text-balance sm:text-4xl">
              {user.name ?? "Member"}
            </h1>
            {membership?.membershipId && (
              <p className="mt-1 font-mono text-sm text-muted-2">{membership.membershipId}</p>
            )}
            <p className="mt-3 text-pretty text-sm font-medium italic text-green">&ldquo;{MISSION_TAGLINE}&rdquo;</p>
          </div>
          <blockquote className="max-w-xs border-l-2 border-green pl-4 text-sm leading-relaxed text-heading/80">
            {MISSION_QUOTE}
          </blockquote>
        </div>
      </section>

      {/* Status cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard icon={IdCard} label="Member ID" value={memberId} mono />
        <StatusCard icon={BadgeCheck} label="Membership Category" value={category} />
        <StatusCard
          icon={CheckCircle2}
          label="Membership Status"
          value={isActive ? "Active" : membership ? "Inactive" : "Pending"}
          hint={validTill ? `Valid till ${validTill}` : undefined}
          tone={isActive ? "green" : "amber"}
        />
        <StatusCard
          icon={Users}
          label="Voting Status"
          value={votingEligible ? "Eligible" : "Non-Voting"}
          action={{ label: "View Details", href: "/dashboard/voting" }}
          tone={votingEligible ? "green" : "muted"}
        />
      </section>

        {/* Apply-for-membership CTA — only for users without an active membership */}
        {!isActive && <MembershipCta pending={Boolean(membership)} />}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions + latest updates (left, 2 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Quick Actions">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <QuickAction icon={UserCog} label="Update Profile" href="/dashboard/profile" />
              <QuickAction icon={FileText} label="Download Certificate" href="/dashboard/membership" />
              {isActive ? (
                <QuickAction icon={ShieldCheck} label="Apply for Voting Eligibility" href="/dashboard/voting" />
              ) : (
                <QuickAction icon={UserPlus} label="Apply for Membership" href="/dashboard/membership" highlight />
              )}
              <QuickAction icon={RefreshCw} label="Renew Membership" href="/dashboard/membership" />
            </div>
          </Panel>

          <Panel title="Latest Updates" action={{ label: "View All", href: "/news" }}>
            <ul className="flex flex-col divide-y divide-line">
              {news.length === 0 && <li className="py-3 text-sm text-muted-2">No updates yet.</li>}
              {news.map((n) => (
                <li key={n.id}>
                  <Link href={`/news/${n.id}`} className="flex items-center gap-4 py-3 group">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-mint">
                      {n.image && <Image src={n.image || "/placeholder.svg"} alt="" fill className="object-cover" sizes="56px" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-heading group-hover:text-green">
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-2">
                        {n.category} · {fmtDate(n.createdAt)}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-2 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Upcoming events + opportunities (right) */}
        <div className="flex flex-col gap-6">
          <Panel title="Upcoming Events" action={{ label: "View All", href: "/dashboard/events" }}>
            <ul className="flex flex-col gap-3">
              {events.length === 0 && <li className="text-sm text-muted-2">No upcoming events.</li>}
              {events.map((e) => {
                const d = new Date(e.startsAt)
                return (
                  <li key={e.id}>
                    <Link href="/dashboard/events" className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-mint/60 group">
                      <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-mint text-green">
                        <span className="text-base font-extrabold leading-none">{d.getDate()}</span>
                        <span className="text-[10px] font-bold uppercase">
                          {d.toLocaleDateString("en-US", { month: "short" })}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-heading">{e.title}</span>
                        <span className="block truncate text-xs text-muted-2">{e.location || "Online Event"}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-2 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel title="Opportunities" action={{ label: "View All", href: "/dashboard/opportunities" }}>
            <ul className="flex flex-col gap-2">
              {OPPORTUNITIES.map((o) => {
                const Icon = OPP_ICONS[o.icon]
                return (
                  <li key={o.id}>
                    <Link href={o.href} className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-mint/60">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-heading">{o.title}</span>
                        <span className="block truncate text-xs text-muted-2">{o.subtitle}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>
        </div>
      </div>

      {/* CTA banner */}
      <section className="relative overflow-hidden rounded-2xl bg-navy px-6 py-8 sm:px-10">
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-white text-balance">
              Be Part of a Stronger <span className="text-green-light">Digital Pakistan</span>
            </h2>
            <p className="mt-1 text-sm text-white/70">Access exclusive opportunities, events and resources.</p>
          </div>
          <Link
            href="/dashboard/opportunities"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-navy transition-colors hover:bg-white/90"
          >
            Explore Opportunities <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}

function StatusCard({
  icon: Icon,
  label,
  value,
  hint,
  mono,
  tone = "green",
  action,
}: {
  icon: typeof IdCard
  label: string
  value: string
  hint?: string
  mono?: boolean
  tone?: "green" | "amber" | "muted"
  action?: { label: string; href: string }
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-100 text-amber-700"
      : tone === "muted"
        ? "bg-muted text-muted-2"
        : "bg-mint text-green"
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-card p-4">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-2">{label}</p>
        <p className={`mt-0.5 truncate text-base font-bold text-heading ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
        {hint && <p className="text-xs text-muted-2">{hint}</p>}
        {action && (
          <Link href={action.href} className="mt-0.5 inline-block text-xs font-semibold text-green hover:text-green-hover">
            {action.label}
          </Link>
        )}
      </div>
    </div>
  )
}

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: { label: string; href: string }
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-heading">{title}</h2>
        {action && (
          <Link href={action.href} className="text-xs font-semibold text-green hover:text-green-hover">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function QuickAction({
  icon: Icon,
  label,
  href,
  highlight,
}: {
  icon: typeof IdCard
  label: string
  href: string
  highlight?: boolean
}) {
  if (highlight) {
    return (
      <Link
        href={href}
        className="relative flex flex-col items-center gap-2 rounded-xl bg-green p-4 text-center transition-colors hover:bg-green-hover"
      >
        <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-white text-green">
          <ArrowRight className="size-3.5" />
        </span>
        <span className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white">
          <Icon className="size-5" />
        </span>
        <span className="text-xs font-semibold leading-tight text-white text-balance">{label}</span>
      </Link>
    )
  }
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border border-line p-4 text-center transition-colors hover:border-green-border hover:bg-mint/50"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-mint text-green">
        <Icon className="size-5" />
      </span>
      <span className="text-xs font-semibold leading-tight text-heading text-balance">{label}</span>
    </Link>
  )
}

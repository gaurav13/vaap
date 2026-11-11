import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  FileText,
  IdCard,
  MapPin,
  PenLine,
  RefreshCw,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
  Zap,
} from "lucide-react"
import { getSession } from "@/lib/session"
import { getMyMembership } from "@/app/actions/cms"
import { getPublishedNews, getPublishedEvents } from "@/app/actions/public"
import { getPublishedArticles } from "@/app/actions/articles"
import { MISSION_TAGLINE } from "@/lib/member/content"
import { effectiveExpiry } from "@/lib/membership"
import { getMembershipStanding, MEMBERSHIP_STATE_LABEL } from "@/lib/membership-state"
import { MembershipCta } from "@/components/member/membership-cta"
import { MembershipJourney } from "@/components/member/membership-journey"
import { LatestUpdates } from "@/components/member/latest-updates"

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const user = session.user

  // Claims an email-only member row for this account before resolving standing.
  const profile = await getMyMembership(user.id)
  const profileComplete = Boolean(
    user.name?.trim() && profile?.phone && profile?.city && (profile?.designation || profile?.organization),
  )
  const [standing, news, articles, events] = await Promise.all([
    getMembershipStanding(user.id, user.email),
    getPublishedNews(24),
    getPublishedArticles(),
    getPublishedEvents(3),
  ])

  const membership = standing.member
  const isActive = standing.state === "active"
  const notMember = standing.state === "not-member"
  const memberId = membership?.membershipId ?? "Not Assigned"
  const category = membership?.category
    ? `${membership.category} Member`
    : standing.application && !notMember && standing.state !== "rejected"
      ? `${standing.application.category} (applied)`
      : "Not Selected"
  const inJourney = ["not-member", "payment-pending", "under-review", "rejected"].includes(standing.state)
  const applied = standing.state === "payment-pending" || standing.state === "under-review"
  const statusLabel = notMember ? "Not Applied" : MEMBERSHIP_STATE_LABEL[standing.state]
  const validExpiry = isActive ? effectiveExpiry(membership?.joinedAt, membership?.expiresAt) : null
  const validTill = validExpiry ? fmtDate(validExpiry) : null
  const votingEligible = isActive && (membership?.votingEligible ?? false)
  const statusTone: "green" | "amber" | "red" | "neutral" = isActive
    ? "green"
    : standing.state === "payment-pending" || standing.state === "under-review" || notMember
      ? "amber"
      : "red"

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="relative -mx-4 -mt-6 overflow-hidden border-b border-line bg-card sm:-mx-6 lg:-mx-8">
        <Image
          src="/images/member-dashboard-hero.png"
          alt=""
          fill
          priority
          className="object-cover object-right"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-card via-card/80 to-card/0 md:via-card/40" />
        <div className="relative px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <p className="text-base font-medium text-heading">Welcome Back,</p>
          <h1 className="mt-1 text-balance text-3xl font-bold tracking-tight text-heading sm:text-4xl">
            {user.name ?? "Member"}
          </h1>
          {membership?.membershipId && (
            <p className="mt-1 font-mono text-sm text-muted-2">{membership.membershipId}</p>
          )}
          <p className="mt-4 border-l-2 border-green pl-3 text-pretty text-base italic text-heading/80">
            &ldquo;{MISSION_TAGLINE}&rdquo;
          </p>
        </div>
      </section>

      {inJourney && (
        <MembershipJourney
          profileComplete={profileComplete}
          applied={applied}
          paid={standing.state === "under-review"}
          verified={false}
        />
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          icon={IdCard}
          label="Member ID"
          value={memberId}
          hint={membership || inJourney ? undefined : "Issued once your membership is approved"}
        />
        <StatusCard
          icon={BadgeCheck}
          label="Membership Category"
          value={category}
        />
        <StatusCard
          icon={CheckCircle2}
          label="Membership Status"
          value={statusLabel}
          valueTone={statusTone}
          highlight={!isActive}
          hint={validTill ? `Valid till ${validTill}` : undefined}
        />
        <StatusCard
          icon={Users}
          label="Voting Status"
          value={votingEligible ? "Eligible" : "Non-Voting"}
          hint={votingEligible ? undefined : "Voting eligibility depends on your approved membership category."}
          action={{ label: "View Details", href: "/dashboard/voting" }}
        />
      </section>

      {!isActive && <MembershipCta pending={!notMember && standing.state !== "rejected"} />}

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <div className="rounded-2xl border border-line bg-card p-5 lg:col-span-2 xl:col-span-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-heading">
            <Zap className="size-5 text-gold" aria-hidden />
            Quick Actions
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction icon={UserCog} label="Update Profile" href="/dashboard/profile" />
            <QuickAction icon={FileText} label="Download Certificate" href="/dashboard/membership" />
            {isActive ? (
              <QuickAction icon={ShieldCheck} label="Apply for Voting Eligibility" href="/dashboard/voting" />
            ) : (
              <QuickAction icon={UserPlus} label="Apply for Membership" href="/dashboard/membership" />
            )}
            <QuickAction icon={RefreshCw} label="Renew Membership" href="/dashboard/membership" />
          </div>
        </div>

        <Link
          href="/dashboard/events"
          className="group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl bg-navy p-6 text-primary-foreground xl:col-span-3"
        >
          <CalendarDays
            className="pointer-events-none absolute -right-3 -top-3 size-28 text-primary-foreground/10"
            aria-hidden
          />
          <CalendarDays className="size-8 text-primary-foreground" aria-hidden />
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Submit Event</h2>
              <p className="mt-1 text-pretty text-sm leading-relaxed text-primary-foreground/75">
                List your event on the VAAP platform
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-5" aria-hidden />
            </span>
          </div>
        </Link>

        <Link
          href="/dashboard/articles"
          className="group flex min-h-44 flex-col justify-between rounded-2xl border border-gold/30 bg-gold-tint p-6 xl:col-span-3"
        >
          <PenLine className="size-8 text-gold" aria-hidden />
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-heading">Submit Article</h2>
              <p className="mt-1 text-pretty text-sm leading-relaxed text-body">
                Share your research, analysis or opinion
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-primary-foreground transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-5" aria-hidden />
            </span>
          </div>
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <LatestUpdates
          className="lg:col-span-2"
          items={[
            ...news.map((n) => ({
              id: `news-${n.id}`,
              href: `/news/${n.id}`,
              title: n.title,
              excerpt: n.excerpt ?? null,
              image: n.image ?? null,
              category: n.category,
              publisherName: n.publisherName ?? null,
              externalUrl: n.externalUrl ?? null,
              createdAt: new Date(n.createdAt).toISOString(),
            })),
            ...articles.slice(0, 24).map((a) => ({
              id: `article-${a.id}`,
              href: `/insights/${a.slug}`,
              title: a.title,
              excerpt: a.excerpt ?? null,
              image: a.image ?? null,
              category: a.category,
              publisherName: a.authorName?.trim() || "VAAP",
              externalUrl: null,
              createdAt: new Date(a.publishedAt ?? 0).toISOString(),
            })),
          ].sort((x, y) => y.createdAt.localeCompare(x.createdAt))}
        />

        <Panel icon={CalendarDays} title="Upcoming Events" action={{ label: "View All Events", href: "/dashboard/events" }}>
          {events.length === 0 && <p className="text-sm text-muted-2">No upcoming events.</p>}
          <ul className="flex flex-col divide-y divide-line">
            {events.map((e) => {
              const d = new Date(e.startsAt)
              return (
                <li key={e.id}>
                  <Link href="/dashboard/events" className="group flex items-center gap-4 py-3">
                    <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg bg-mint text-green">
                      <span className="text-xl font-extrabold leading-none">{d.getDate()}</span>
                      <span className="mt-0.5 text-[11px] font-bold uppercase">
                        {d.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-bold text-heading group-hover:text-green">
                        {e.title}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-2">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        {e.location || "Online Event"}
                      </span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-heading transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Panel>
      </section>
    </div>
  )
}

function StatusCard({
  icon: Icon,
  label,
  value,
  hint,
  valueTone,
  highlight,
  action,
}: {
  icon: typeof IdCard
  label: string
  value: string
  hint?: string
  valueTone?: "green" | "amber" | "red" | "neutral"
  highlight?: boolean
  action?: { label: string; href: string }
}) {
  const toneClass = {
    green: "text-green",
    amber: "text-amber",
    red: "text-red-700",
    neutral: "text-body",
  } as const
  const valueClass = valueTone ? toneClass[valueTone] : "text-heading"
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${
        highlight ? "border-amber/20 bg-amber-tint" : "border-line bg-card"
      }`}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-mint text-green">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-2">{label}</p>
        <p className={`mt-0.5 text-pretty text-xl font-bold leading-snug ${valueClass}`}>{value}</p>
        {hint && <p className="mt-0.5 text-pretty text-xs leading-relaxed text-muted-2">{hint}</p>}
        {action && (
          <Link
            href={action.href}
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-green hover:text-green-hover"
          >
            {action.label}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  )
}

function Panel({
  icon: Icon,
  title,
  action,
  className,
  children,
}: {
  icon: typeof IdCard
  title: string
  action?: { label: string; href: string }
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`rounded-2xl border border-line bg-card p-5 ${className ?? ""}`}>
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-heading">
          <Icon className="size-5 text-green" aria-hidden />
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-green hover:text-green-hover"
          >
            {action.label}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function QuickAction({ icon: Icon, label, href }: { icon: typeof IdCard; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border border-line p-4 text-center transition-colors hover:border-green-border hover:bg-mint/50"
    >
      <Icon className="size-7 text-green" aria-hidden />
      <span className="text-balance text-xs font-semibold leading-tight text-heading">{label}</span>
    </Link>
  )
}

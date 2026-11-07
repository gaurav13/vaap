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
  UserRound,
  Users,
  Zap,
} from "lucide-react"
import { getSession } from "@/lib/session"
import { getMyMembership } from "@/app/actions/cms"
import { getPublishedNews, getPublishedEvents } from "@/app/actions/public"
import { MISSION_TAGLINE } from "@/lib/member/content"
import { effectiveExpiry } from "@/lib/membership"
import { MembershipCta } from "@/components/member/membership-cta"

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const user = session.user

  const [membership, news, events] = await Promise.all([
    getMyMembership(user.id),
    getPublishedNews(3),
    getPublishedEvents(3),
  ])

  const memberId = membership?.membershipId ?? "Pending assignment"
  const category = membership?.category ? `${membership.category} Member` : "Under review"
  const isActive = membership?.status === "active"
  const validExpiry = isActive ? effectiveExpiry(membership?.joinedAt, membership?.expiresAt) : null
  const validTill = validExpiry ? fmtDate(validExpiry) : null
  const votingEligible = membership?.votingEligible ?? false
  const [featured, ...moreNews] = news

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard icon={IdCard} label="Member ID" value={memberId} />
        <StatusCard icon={BadgeCheck} label="Membership Category" value={category} />
        <StatusCard
          icon={CheckCircle2}
          label="Membership Status"
          value={isActive ? "Active" : membership ? "Inactive" : "Pending"}
          valueTone={isActive ? "green" : "amber"}
          hint={validTill ? `Valid till ${validTill}` : undefined}
        />
        <StatusCard
          icon={Users}
          label="Voting Status"
          value={votingEligible ? "Eligible" : "Non-Voting"}
          action={{ label: "View Details", href: "/dashboard/voting" }}
        />
      </section>

      {!isActive && <MembershipCta pending={Boolean(membership)} />}

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
        <Panel
          icon={PenLine}
          title="Latest Articles"
          action={{ label: "View All Articles", href: "/news" }}
          className="lg:col-span-2"
        >
          {!featured && <p className="text-sm text-muted-2">No articles yet.</p>}
          {featured && (
            <Link
              href={`/news/${featured.id}`}
              className="group flex flex-col gap-4 rounded-xl border border-line bg-muted/50 p-3 sm:flex-row"
            >
              <span className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-navy sm:w-60">
                {featured.image && (
                  <Image src={featured.image} alt="" fill className="object-cover" sizes="240px" />
                )}
                <span className="absolute left-2 top-2 rounded bg-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                  Featured
                </span>
              </span>
              <span className="flex min-w-0 flex-col justify-center gap-2 py-1">
                <span className="text-pretty text-base font-bold leading-snug text-heading group-hover:text-green">
                  {featured.title}
                </span>
                <span className="line-clamp-2 text-sm leading-relaxed text-body">{featured.excerpt}</span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-2">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="size-3.5" aria-hidden />
                    {featured.publisherName || featured.category}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {fmtDate(featured.createdAt)}
                  </span>
                </span>
              </span>
            </Link>
          )}
          {moreNews.length > 0 && (
            <ul className="mt-2 flex flex-col divide-y divide-line">
              {moreNews.map((n) => (
                <li key={n.id}>
                  <Link href={`/news/${n.id}`} className="group flex items-center gap-4 py-3">
                    <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-mint">
                      {n.image && <Image src={n.image} alt="" fill className="object-cover" sizes="96px" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-bold text-heading group-hover:text-green">
                        {n.title}
                      </span>
                      <span className="mt-1 block text-xs text-muted-2">
                        {n.category} · {fmtDate(n.createdAt)}
                      </span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-heading transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

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
  action,
}: {
  icon: typeof IdCard
  label: string
  value: string
  hint?: string
  valueTone?: "green" | "amber"
  action?: { label: string; href: string }
}) {
  const valueClass = valueTone === "green" ? "text-green" : valueTone === "amber" ? "text-amber-700" : "text-heading"
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-mint text-green">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-2">{label}</p>
        <p className={`mt-0.5 truncate text-base font-bold ${valueClass}`}>{value}</p>
        {hint && <p className="text-xs text-muted-2">{hint}</p>}
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

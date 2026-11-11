import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUp, Banknote, BarChart3, Clock, Layers, Users, Zap, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type Tone = "green" | "teal" | "amber" | "indigo"
export type StatCard = { label: string; value: number | string; hint?: string; hintTone?: "up" | "warn"; href: string; icon: LucideIcon; tone: Tone }
export type ModuleCard = { label: string; description: string; href: string; icon: LucideIcon; tone: Tone; count?: number }
export type ActivityItem = { id: number; action: string; target: string; actor: string; at: Date }
export type ApprovalItem = { label: string; count: number; href: string; icon: LucideIcon; tone: Tone }
export type QuickAction = { label: string; href: string; icon: LucideIcon; tone?: Tone | "danger" }

const TILE: Record<Tone, string> = {
  green: "bg-mint text-green",
  teal: "bg-blue-tint text-teal",
  amber: "bg-amber-tint text-amber",
  indigo: "bg-indigo-tint text-indigo",
}

function Tile({ icon: Icon, tone, size = "md" }: { icon: LucideIcon; tone: Tone; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        TILE[tone],
        size === "lg" ? "size-14" : size === "md" ? "size-12" : "size-8 rounded-lg",
      )}
    >
      <Icon className={size === "sm" ? "size-4" : "size-6"} aria-hidden />
    </span>
  )
}

export function DashboardHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="relative -mx-5 -mt-8 overflow-hidden px-5 pb-6 pt-8 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10">
      <Image
        src="/images/admin-hero-skyline.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="pointer-events-none object-cover object-right opacity-90"
      />
      <div className="relative">
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-heading">{title}</h1>
        <p className="mt-1 text-pretty text-body">{subtitle}</p>
        <span className="mt-3 block h-1 w-14 rounded-full bg-green" aria-hidden />
      </div>
    </header>
  )
}

export function StatGrid({ stats }: { stats: StatCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <Link
          key={s.label}
          href={s.href}
          className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-border hover:shadow-md"
        >
          <Tile icon={s.icon} tone={s.tone} size="lg" />
          <div className="min-w-0">
            <p className="text-3xl font-extrabold leading-none text-heading">{s.value}</p>
            <p className="mt-1.5 text-sm text-body">{s.label}</p>
            {s.hint &&
              (s.hintTone === "warn" ? (
                <span className="mt-1.5 inline-flex rounded-full bg-amber-tint px-2.5 py-0.5 text-xs font-semibold text-amber">{s.hint}</span>
              ) : (
                <p className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-green">
                  <ArrowUp className="size-3" aria-hidden />
                  {s.hint}
                </p>
              ))}
          </div>
        </Link>
      ))}
    </div>
  )
}

function Sparkline({ points = [] }: { points?: number[] }) {
  if (points.length < 2 || Math.max(...points) === 0) return null
  const w = 320
  const h = 80
  const max = Math.max(...points)
  const step = w / (points.length - 1)
  const coords = points.map((p, i) => [i * step, h - 6 - (p / max) * (h - 14)] as const)
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const area = `0,${h} ${line} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full max-w-xs" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="rev-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--green-light)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--green-light)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#rev-fill)" />
      <polyline points={line} fill="none" stroke="var(--green-light)" strokeWidth="2.5" strokeLinejoin="round" />
      {coords
        .filter((_, i) => i % Math.max(1, Math.floor(points.length / 8)) === 0 || i === coords.length - 1)
        .map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="3.5" fill="var(--card)" />
        ))}
    </svg>
  )
}

export function RevenueBanner({
  totals,
  paidMembers,
  pendingPayments,
  trend,
}: {
  totals: { currency: string; amount: number }[]
  paidMembers: number
  pendingPayments: number
  trend: number[]
}) {
  const rate = paidMembers + pendingPayments > 0 ? Math.round((paidMembers / (paidMembers + pendingPayments)) * 100) : 0
  const [primary, ...rest] = totals
  return (
    <section
      aria-label="Membership revenue"
      className="flex flex-col gap-6 rounded-2xl bg-navy-dark p-6 text-primary-foreground shadow-md lg:flex-row lg:items-center"
    >
      <div className="flex items-center gap-4 lg:border-r lg:border-primary-foreground/15 lg:pr-8">
        <Banknote className="size-12 shrink-0 text-green-light" aria-hidden />
        <div>
          <p className="text-sm font-medium text-primary-foreground/75">Membership Revenue (Received)</p>
          <p className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            {primary ? `${primary.currency} ${primary.amount.toLocaleString("en-US")}` : "No payments yet"}
          </p>
          {rest.map((t) => (
            <p key={t.currency} className="text-sm font-semibold text-primary-foreground/75">
              + {t.currency} {t.amount.toLocaleString("en-US")}
            </p>
          ))}
        </div>
      </div>
      <dl className="flex flex-wrap gap-6 lg:gap-0 lg:divide-x lg:divide-primary-foreground/15">
        {[
          { label: "Paid Members", value: paidMembers, icon: Users, tone: "text-green-light" },
          { label: "Pending Payments", value: pendingPayments, icon: Clock, tone: "text-amber" },
          { label: "Payment Rate", value: `${rate}%`, icon: BarChart3, tone: "text-green-light" },
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-3 lg:px-6">
            <m.icon className={cn("size-6", m.tone)} aria-hidden />
            <div>
              <dd className="text-2xl font-bold">{m.value}</dd>
              <dt className="text-xs text-primary-foreground/70">{m.label}</dt>
            </div>
          </div>
        ))}
      </dl>
      <div className="flex flex-col items-end gap-1 lg:ml-auto">
        <span className="rounded-lg border border-primary-foreground/25 px-3 py-1 text-xs font-medium text-primary-foreground/85">Last 30 days</span>
        <Sparkline points={trend} />
      </div>
    </section>
  )
}

export function ModuleGrid({ modules, title = "Management Modules" }: { modules: ModuleCard[]; title?: string }) {
  return (
    <section aria-labelledby="modules">
      <h2 id="modules" className="mb-3 text-xl font-bold text-heading">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex items-center gap-4 rounded-2xl border border-line bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-border hover:shadow-md"
          >
            <Tile icon={m.icon} tone={m.tone} />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-heading">{m.label}</p>
              <p className="text-pretty text-xs leading-relaxed text-muted-2">{m.description}</p>
            </div>
            {m.count !== undefined && (
              <span className="rounded-lg bg-surface px-2.5 py-1 text-sm font-bold text-heading">{m.count}</span>
            )}
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-heading transition-colors group-hover:bg-mint group-hover:text-green">
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

const ACTION_STYLE: Record<NonNullable<QuickAction["tone"]>, string> = {
  green: "text-green",
  teal: "text-teal",
  amber: "text-amber",
  indigo: "text-indigo",
  danger: "text-destructive",
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null
  return (
    <section aria-labelledby="quick-actions" className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h2 id="quick-actions" className="mb-4 flex items-center gap-2 text-lg font-bold text-heading">
        <Zap className="size-5 text-heading" aria-hidden /> Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map((a, i) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold shadow-sm transition-colors",
              i === 0 ? "border-green-border bg-mint text-heading hover:bg-mint-2" : "border-line bg-card text-heading hover:border-green-border",
            )}
          >
            <a.icon className={cn("size-5 shrink-0", ACTION_STYLE[a.tone ?? "green"])} aria-hidden />
            <span className="truncate">{a.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function timeAgo(date: Date) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000))
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

function activityTone(action: string): Tone {
  if (/pay|paid/i.test(action)) return "green"
  if (/event|rsvp|participant/i.test(action)) return "indigo"
  if (/article|news|page|content/i.test(action)) return "teal"
  if (/delete|reject/i.test(action)) return "amber"
  return "green"
}

function PanelHeader({ id, icon: Icon, title, href, linkLabel }: { id: string; icon: LucideIcon; title: string; href?: string; linkLabel: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2 text-lg font-bold text-heading">
        <Icon className="size-5" aria-hidden /> {title}
      </h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-green hover:text-green-hover">
          {linkLabel} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      )}
    </div>
  )
}

export function RecentActivity({ items, viewAllHref }: { items: ActivityItem[]; viewAllHref?: string }) {
  return (
    <section aria-labelledby="recent-activity" className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <PanelHeader id="recent-activity" icon={Layers} title="Recent Activity" href={viewAllHref} linkLabel="View All" />
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-2">No activity recorded yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-light">
          {items.map((it) => {
            const tone = activityTone(it.action)
            return (
              <li key={it.id} className="flex items-center gap-3 py-2.5">
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", TILE[tone])}>
                  <span className="size-2 rounded-full bg-current" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold capitalize text-heading">{it.action.replace(/[._-]/g, " ")}</p>
                  {(it.target || it.actor) && (
                    <p className="truncate text-xs text-muted-2">
                      {it.target}
                      {it.actor ? ` · ${it.actor}` : ""}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-2">{timeAgo(it.at)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function PendingApprovals({ items }: { items: ApprovalItem[] }) {
  const total = items.reduce((n, i) => n + i.count, 0)
  return (
    <section aria-labelledby="pending-approvals" className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <PanelHeader
        id="pending-approvals"
        icon={Clock}
        title="Pending Approvals"
        href={items[0]?.href}
        linkLabel={`View All (${total})`}
      />
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-2">Nothing waiting for review.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-light">
          {items.map((it) => (
            <li key={it.href} className="flex items-center gap-3 py-2.5">
              <Tile icon={it.icon} tone={it.tone} size="sm" />
              <span className="flex-1 text-sm font-semibold text-heading">{it.label}</span>
              <span className="flex size-7 items-center justify-center rounded-full bg-surface text-sm font-bold text-heading">{it.count}</span>
              <Link
                href={it.href}
                className="rounded-lg border border-green-border bg-mint px-4 py-1.5 text-xs font-semibold text-green transition-colors hover:bg-green hover:text-primary-foreground"
              >
                Review
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

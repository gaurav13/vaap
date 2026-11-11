import Link from "next/link"
import { ArrowRight, Clock, type LucideIcon } from "lucide-react"

export type StatCard = { label: string; value: number | string; hint?: string; href: string; icon: LucideIcon }
export type ModuleCard = { label: string; description: string; href: string; icon: LucideIcon; count?: number }
export type ActivityItem = { id: number; action: string; target: string; actor: string; at: Date }
export type ApprovalItem = { label: string; count: number; href: string; icon: LucideIcon }

export function StatGrid({ stats }: { stats: StatCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon
        return (
          <Link
            key={s.label}
            href={s.href}
            className="flex items-center gap-4 rounded-xl border border-line bg-card p-5 transition-colors hover:border-green-border"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-mint text-green">
              <Icon className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted-2">{s.label}</p>
              <p className="text-2xl font-extrabold text-heading">{s.value}</p>
              {s.hint && <p className="truncate text-xs font-medium text-green">{s.hint}</p>}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export function RevenueBanner({ totals, paidMembers, pendingPayments }: { totals: { currency: string; amount: number }[]; paidMembers: number; pendingPayments: number }) {
  const rate = paidMembers + pendingPayments > 0 ? Math.round((paidMembers / (paidMembers + pendingPayments)) * 100) : 0
  return (
    <section aria-label="Membership revenue" className="flex flex-col gap-6 rounded-xl bg-navy p-6 text-white md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium text-white/70">Membership revenue (received)</p>
        {totals.length === 0 ? (
          <p className="mt-1 text-3xl font-extrabold">No payments yet</p>
        ) : (
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {totals.map((t, i) => (
              <p key={t.currency} className={i === 0 ? "text-3xl font-extrabold" : "text-lg font-semibold text-white/80"}>
                {t.currency} {t.amount.toLocaleString("en-US")}
              </p>
            ))}
          </div>
        )}
      </div>
      <dl className="flex gap-8">
        <div>
          <dt className="text-xs text-white/60">Paid members</dt>
          <dd className="text-2xl font-bold">{paidMembers}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/60">Pending payments</dt>
          <dd className="text-2xl font-bold">{pendingPayments}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/60">Payment rate</dt>
          <dd className="text-2xl font-bold text-green-light">{rate}%</dd>
        </div>
      </dl>
    </section>
  )
}

export function QuickActions({ actions }: { actions: { label: string; href: string; icon: LucideIcon }[] }) {
  if (actions.length === 0) return null
  return (
    <section aria-labelledby="quick-actions" className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5 lg:flex-row lg:items-center">
      <h2 id="quick-actions" className="shrink-0 font-bold text-heading lg:pr-4">
        Quick actions
      </h2>
      <div className="flex flex-wrap gap-2">
        {actions.map((a, i) => {
          const Icon = a.icon
          return (
            <Link
              key={a.href + a.label}
              href={a.href}
              className={
                i === 0
                  ? "inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green/90"
                  : "inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-navy hover:border-green-border"
              }
            >
              <Icon className="size-4" aria-hidden />
              {a.label}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export function ModuleGrid({ modules }: { modules: ModuleCard[] }) {
  return (
    <section aria-labelledby="modules">
      <h2 id="modules" className="mb-3 font-bold text-heading">
        Management modules
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => {
          const Icon = m.icon
          return (
            <Link
              key={m.href}
              href={m.href}
              className="group flex items-center gap-4 rounded-xl border border-line bg-card p-4 transition-colors hover:border-green-border"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-heading">{m.label}</p>
                <p className="text-pretty text-xs leading-relaxed text-muted-2">{m.description}</p>
              </div>
              {m.count !== undefined && (
                <span className="rounded-lg bg-muted/60 px-2.5 py-1 text-sm font-bold text-heading">{m.count}</span>
              )}
              <ArrowRight className="size-4 shrink-0 text-green transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function timeAgo(date: Date) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000))
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} d ago`
}

export function RecentActivity({ items, viewAllHref }: { items: ActivityItem[]; viewAllHref?: string }) {
  return (
    <section aria-labelledby="recent-activity" className="rounded-xl border border-line bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-activity" className="flex items-center gap-2 font-bold text-heading">
          <Clock className="size-4 text-green" aria-hidden /> Recent activity
        </h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="inline-flex items-center gap-1 text-sm font-semibold text-green">
            View all <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-2">No activity recorded yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold capitalize text-heading">{it.action.replace(/[._-]/g, " ")}</p>
                <p className="truncate text-xs text-muted-2">
                  {it.target}
                  {it.actor ? ` · ${it.actor}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-2">{timeAgo(it.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function PendingApprovals({ items }: { items: ApprovalItem[] }) {
  const total = items.reduce((n, i) => n + i.count, 0)
  return (
    <section aria-labelledby="pending-approvals" className="rounded-xl border border-line bg-card p-5">
      <h2 id="pending-approvals" className="mb-3 font-bold text-heading">
        Pending approvals <span className="text-muted-2">({total})</span>
      </h2>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-2">Nothing waiting for review.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {items.map((it) => {
            const Icon = it.icon
            return (
              <li key={it.href} className="flex items-center gap-3 py-2.5">
                <Icon className="size-4 shrink-0 text-green" aria-hidden />
                <span className="flex-1 text-sm font-medium text-heading">{it.label}</span>
                <span className="text-sm font-bold text-heading">{it.count}</span>
                <Link
                  href={it.href}
                  className="rounded-md bg-mint px-3 py-1 text-xs font-semibold text-green hover:bg-green hover:text-white"
                >
                  Review
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

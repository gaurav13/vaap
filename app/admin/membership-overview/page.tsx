import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { formatReportingTime, getMembershipStats, REPORTING_TIMEZONE } from "@/lib/membership-stats"

function parseDate(v?: string, endOfDay = false) {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined
  const d = new Date(`${v}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export default async function MembershipOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; from?: string; to?: string }>
}) {
  const session = await getSession()
  const role = session?.user?.role
  if (role !== "admin" && role !== "manager") redirect("/admin")

  const sp = await searchParams
  const category = sp.category && sp.category !== "all" ? sp.category.slice(0, 80) : undefined
  const from = parseDate(sp.from)
  const to = parseDate(sp.to, true)
  const s = await getMembershipStats({ category, from, to })

  const cards: { label: string; value: number; hint: string; href: string }[] = [
    { label: "Registered users", value: s.registered, hint: "Accounts created", href: "/admin/members" },
    { label: "Applications", value: s.applications, hint: "Started, excluding deleted", href: "/admin/applications?filter=all" },
    { label: "Incomplete", value: s.incomplete, hint: "Started, not submitted", href: "/admin/applications?filter=incomplete" },
    { label: "Pending", value: s.pending, hint: "Submitted, awaiting decision", href: "/admin/applications?filter=pending" },
    { label: "Paid", value: s.paid, hint: "Payment verified", href: "/admin/applications?filter=pending" },
    { label: "Unpaid", value: s.unpaid, hint: "Submitted, payment unverified", href: "/admin/applications?filter=unpaid" },
    { label: "Approved", value: s.approved, hint: "Approved applications", href: "/admin/applications?filter=approved" },
    { label: "Rejected", value: s.rejected, hint: "Rejected applications", href: "/admin/applications?filter=rejected" },
    { label: "Active members", value: s.active, hint: "Approved, not expired or revoked", href: "/admin/members?stage=active" },
    { label: "Expired members", value: s.expired, hint: "Membership lapsed", href: "/admin/members" },
    { label: "Archived", value: s.archived, hint: "Hidden from lists, still counted", href: "/admin/applications?filter=archived" },
  ]

  const flags = [
    { label: "Applications using test addresses", value: s.flags.testApplications },
    { label: "Accounts using test addresses", value: s.flags.testRegistered },
    { label: "Active members with no payment record", value: s.flags.activeWithoutPaymentRecord },
    { label: "Paid, awaiting approval", value: s.flags.paidAwaitingApproval },
  ].filter((f) => f.value > 0)

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Membership Overview</h1>
      <p className="mt-1 text-pretty text-muted-2">
        The single source for membership numbers. The Dashboard and Applications tabs use the same calculation.
      </p>

      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-sm text-body">
          Category
          <select name="category" defaultValue={category ?? "all"} className="rounded-lg border border-line bg-card px-3 py-2 text-sm">
            <option value="all">All categories</option>
            {s.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-body">
          From
          <input type="date" name="from" defaultValue={sp.from ?? ""} className="rounded-lg border border-line bg-card px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-body">
          To
          <input type="date" name="to" defaultValue={sp.to ?? ""} className="rounded-lg border border-line bg-card px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white">Apply</button>
        <Link href="/admin/membership-overview" className="px-2 py-2 text-sm text-muted-2 underline">Reset</Link>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="flex flex-col gap-1 rounded-xl border border-line bg-card p-4 transition-colors hover:bg-mint">
            <span className="text-sm font-medium text-muted-2">{c.label}</span>
            <span className="text-2xl font-bold tabular-nums text-heading">{c.value}</span>
            <span className="text-xs text-muted-2">{c.hint}</span>
          </Link>
        ))}
      </div>

      {flags.length > 0 && (
        <section className="mt-6 rounded-xl border border-line bg-card p-4" aria-labelledby="flags-heading">
          <h2 id="flags-heading" className="text-sm font-bold text-heading">Data flags (included in the counts above)</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-body">
            {flags.map((f) => (
              <li key={f.label} className="flex justify-between gap-4">
                <span>{f.label}</span>
                <span className="font-semibold tabular-nums">{f.value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-xs text-muted-2">
        Generated {formatReportingTime(s.generatedAt)} ({REPORTING_TIMEZONE}). Date filters apply to application creation date. Deleted records are excluded everywhere.
      </p>
    </div>
  )
}

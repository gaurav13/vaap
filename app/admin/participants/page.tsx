import Link from "next/link"
import { Search } from "lucide-react"
import { getParticipantsOverview, searchAllParticipants } from "@/app/actions/event-participants"
import { AutoRefresh } from "@/components/admin/auto-refresh"

export const metadata = { title: "Participants | Admin" }

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-mint text-green",
  pending: "bg-amber-50 text-amber-800",
  cancelled: "bg-muted text-muted-2",
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
}

export default async function ParticipantsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q = "", status = "" } = await searchParams
  const searching = Boolean(q.trim() || status)
  const [overview, results] = await Promise.all([
    getParticipantsOverview(),
    searching ? searchAllParticipants(q, status) : Promise.resolve([]),
  ])

  const now = Date.now()
  const totals = overview.reduce(
    (t, e) => ({ confirmed: t.confirmed + e.confirmed, pending: t.pending + e.pending, checkedIn: t.checkedIn + e.checkedIn }),
    { confirmed: 0, pending: 0, checkedIn: 0 },
  )

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-green">Events</p>
          <h1 className="font-serif text-2xl font-bold text-heading">Participants</h1>
          <p className="text-sm text-muted-2">Registrations across every event. Only confirmed participants count toward attendance.</p>
        </div>
        <AutoRefresh intervalMs={30000} />
      </header>

      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: "Confirmed", value: totals.confirmed },
          { label: "Pending verification", value: totals.pending },
          { label: "Checked in", value: totals.checkedIn },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">{s.label}</dt>
            <dd className="text-2xl font-bold tabular-nums text-heading">{s.value}</dd>
          </div>
        ))}
      </dl>

      <form className="flex flex-col gap-2 md:flex-row" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" aria-hidden />
          <label htmlFor="q" className="sr-only">
            Search participants
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search by name, email, organization or event"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
          />
        </div>
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-heading"
        >
          <option value="">Any status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Search</button>
        {searching && (
          <Link href="/admin/participants" className="rounded-lg border border-border px-4 py-2 text-center text-sm font-semibold text-navy hover:bg-mint">
            Clear
          </Link>
        )}
      </form>

      {searching ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-2">
              <tr>
                <th className="px-4 py-3 font-semibold">Participant</th>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-2">
                    No participants found.
                  </td>
                </tr>
              )}
              {results.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-heading">{r.name}</p>
                    <p className="text-xs text-muted-2">
                      {r.email}
                      {r.organization ? ` · ${r.organization}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/events/${r.eventId}/participants`} className="font-semibold text-navy hover:text-green">
                      {r.eventTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                    {r.checkedInAt && <span className="ml-2 text-xs text-green">Checked in</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-2">{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 300 && <p className="px-4 py-2 text-xs text-muted-2">Showing the 300 most recent matches.</p>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-2">
              <tr>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 text-right font-semibold">Confirmed</th>
                <th className="px-4 py-3 text-right font-semibold">Pending</th>
                <th className="px-4 py-3 text-right font-semibold">Checked in</th>
                <th className="px-4 py-3 text-right font-semibold">Cancelled</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {overview.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-2">
                    No events yet.
                  </td>
                </tr>
              )}
              {overview.map((e) => {
                const upcoming = new Date(e.startsAt).getTime() >= now
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-heading">{e.title}</p>
                      <p className="text-xs text-muted-2">
                        {fmtDate(new Date(e.startsAt))}
                        {e.location ? ` · ${e.location}` : ""}
                        <span className={`ml-2 font-semibold ${upcoming ? "text-green" : ""}`}>{upcoming ? "Upcoming" : "Past"}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-heading">{e.confirmed}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-2">{e.pending}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-2">{e.checkedIn}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-2">{e.cancelled}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/events/${e.id}/participants`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:bg-mint"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

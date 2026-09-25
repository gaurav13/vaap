import Link from "next/link"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { getPublicProposalList } from "@/lib/governance-public"
import { PublicProposalCard } from "@/components/governance/public-proposal-card"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Proposals | VAAP Governance",
  description: "Browse all VAAP governance proposals — open, upcoming and completed.",
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open for voting" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
] as const

function matchesFilter(status: string, filter: string) {
  if (filter === "open") return status === "active"
  if (filter === "upcoming") return status === "published"
  if (filter === "completed") return ["closed", "results_published", "archived"].includes(status)
  return true
}

export default async function ProposalsListPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>
}) {
  const { filter = "all", q = "" } = await searchParams
  const [user, all] = await Promise.all([getHeaderUser(), getPublicProposalList()])

  const query = q.trim().toLowerCase()
  const cards = all.filter((c) => {
    if (!matchesFilter(c.proposal.status, filter)) return false
    if (!query) return true
    return (
      c.proposal.title.toLowerCase().includes(query) ||
      (c.proposal.reference ?? "").toLowerCase().includes(query) ||
      c.proposal.category.toLowerCase().includes(query)
    )
  })

  return (
    <>
      <SiteHeaderServer active="Voting" user={user} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-green">VAAP Governance</p>
          <h1 className="mt-2 text-3xl font-bold text-heading sm:text-4xl">Proposals</h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-muted-2">
            Every proposal put to the VAAP membership. Open votes can be cast after signing in; completed votes show
            blockchain-anchored results.
          </p>
        </header>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = f.key === filter
              const params = new URLSearchParams()
              if (f.key !== "all") params.set("filter", f.key)
              if (q) params.set("q", q)
              const href = params.toString() ? `/voting/proposals?${params}` : "/voting/proposals"
              return (
                <Link
                  key={f.key}
                  href={href}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    active ? "bg-green text-white" : "border border-line bg-background text-heading hover:bg-card"
                  }`}
                >
                  {f.label}
                </Link>
              )
            })}
          </div>

          <form action="/voting/proposals" className="flex gap-2">
            {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search proposals…"
              className="h-9 w-full rounded-lg border border-line bg-background px-3 text-sm text-heading outline-none focus:border-green sm:w-56"
            />
            <button
              type="submit"
              className="h-9 shrink-0 rounded-lg bg-green px-4 text-sm font-semibold text-white hover:bg-green-hover"
            >
              Search
            </button>
          </form>
        </div>

        {cards.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center text-sm text-muted-2">
            No proposals match your filters.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <PublicProposalCard key={c.proposal.id} card={c} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  )
}

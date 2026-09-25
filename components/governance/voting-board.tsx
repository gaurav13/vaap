"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Archive, CalendarDays, CheckCircle2, Filter, Search } from "lucide-react"
import { PublicProposalCard } from "@/components/governance/public-proposal-card"
import type { PublicProposalCard as CardData } from "@/lib/governance-public"

type Tab = "active" | "upcoming" | "completed"

export function VotingBoard({
  open,
  upcoming,
  completed,
}: {
  open: CardData[]
  upcoming: CardData[]
  completed: CardData[]
}) {
  const [tab, setTab] = useState<Tab>("active")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")

  const categories = useMemo(
    () => Array.from(new Set([...open, ...upcoming, ...completed].map((c) => c.proposal.category))).sort(),
    [open, upcoming, completed],
  )

  const filter = (cards: CardData[]) => {
    const q = query.trim().toLowerCase()
    return cards.filter(({ proposal }) => {
      if (category !== "all" && proposal.category !== category) return false
      if (!q) return true
      return [proposal.title, proposal.reference ?? "", proposal.summary ?? ""].some((v) => v.toLowerCase().includes(q))
    })
  }

  const f = { active: filter(open), upcoming: filter(upcoming), completed: filter(completed) }

  const tabs: { id: Tab; label: string; icon: typeof CheckCircle2; count: number }[] = [
    { id: "active", label: "Active Votes", icon: CheckCircle2, count: f.active.length },
    { id: "upcoming", label: "Upcoming", icon: CalendarDays, count: f.upcoming.length },
    { id: "completed", label: "Completed", icon: CheckCircle2, count: f.completed.length },
  ]

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-card">
      <div className="flex flex-col gap-3 border-b border-line px-4 pt-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Vote status" className="-mb-px flex gap-2 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon, count }) => {
            const selected = tab === id
            return (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => setTab(id)}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  selected ? "border-green text-green" : "border-transparent text-muted-2 hover:text-heading"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label} ({count})
              </button>
            )
          })}
        </div>
        <div className="flex gap-2 pb-3 lg:pb-0">
          <label className="relative flex-1 lg:w-64">
            <span className="sr-only">Search proposals</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search proposals..."
              className="w-full rounded-lg border border-line bg-background py-2 pl-9 pr-3 text-sm text-heading placeholder:text-muted-2 focus:border-green focus:outline-none"
            />
          </label>
          <label className="relative">
            <span className="sr-only">Filter by category</span>
            <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-heading" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-full appearance-none rounded-lg border border-line bg-background py-2 pl-9 pr-4 text-sm font-semibold text-heading focus:border-green focus:outline-none"
            >
              <option value="all">Filter</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-10 p-4 sm:p-6">
        {tab === "active" && (
          <>
            <Group
              title="Open for voting"
              subtitle="Cast your vote before these proposals close."
              cards={f.active}
              emptyTitle="No proposals are open for voting right now."
              emptyHint="Check upcoming votes for what's scheduled next."
              emphasis
            />
            <Group
              icon={CalendarDays}
              title="Upcoming votes"
              subtitle="Published proposals that will open for voting soon."
              cards={f.upcoming.slice(0, 2)}
              viewAll="/voting/upcoming"
              emptyTitle="No upcoming votes are scheduled."
              emptyHint="New proposals will appear here once they are published."
            />
            <Group
              icon={CheckCircle2}
              title="Completed votes"
              subtitle="Closed proposals with published, blockchain-anchored results."
              cards={f.completed.slice(0, 2)}
              viewAll="/voting/results"
              emptyTitle="No completed votes yet."
              emptyHint="Closed proposals and results will appear here."
              emptyIcon={Archive}
            />
          </>
        )}
        {tab === "upcoming" && (
          <Group
            icon={CalendarDays}
            title="Upcoming votes"
            subtitle="Published proposals that will open for voting soon."
            cards={f.upcoming}
            emptyTitle="No upcoming votes are scheduled."
            emptyHint="New proposals will appear here once they are published."
          />
        )}
        {tab === "completed" && (
          <Group
            icon={CheckCircle2}
            title="Completed votes"
            subtitle="Closed proposals with published, blockchain-anchored results."
            cards={f.completed}
            emptyTitle="No completed votes yet."
            emptyHint="Closed proposals and results will appear here."
            emptyIcon={Archive}
          />
        )}
      </div>
    </section>
  )
}

export function Group({
  icon: Icon,
  title,
  subtitle,
  cards,
  viewAll,
  emptyTitle,
  emptyHint,
  emptyIcon: EmptyIcon = CalendarDays,
  emphasis = false,
}: {
  icon?: typeof CheckCircle2
  title: string
  subtitle: string
  cards: CardData[]
  viewAll?: string
  emptyTitle: string
  emptyHint: string
  emptyIcon?: typeof CheckCircle2
  emphasis?: boolean
}) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3 border-l-4 border-green pl-3">
          {Icon && <Icon className="size-7 shrink-0 text-green" aria-hidden />}
          <div>
            <h2 className="font-serif text-2xl font-bold text-heading">{title}</h2>
            <p className="text-sm text-muted-2">{subtitle}</p>
          </div>
        </div>
        {viewAll && (
          <Link href={viewAll} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-green hover:underline">
            View all <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      {cards.length === 0 ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-gold/40 bg-gold-tint/50 px-6 py-8">
          <EmptyIcon className="size-8 shrink-0 text-gold" aria-hidden />
          <div>
            <p className="text-sm font-medium text-heading">{emptyTitle}</p>
            <p className="text-xs text-muted-2">{emptyHint}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <PublicProposalCard key={c.proposal.id} card={c} emphasis={emphasis && i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}

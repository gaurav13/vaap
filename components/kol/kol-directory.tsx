"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Search, UserRound } from "lucide-react"
import { formatCount } from "@/lib/kol-shared"
import { PlatformIcon, PlatformName, VerifiedBadge } from "@/components/kol/kol-ui"

export type PublicKolCard = {
  slug: string
  name: string
  title: string
  organization: string
  photo: string
  expertise: string[]
  platforms: { platform: string; followers: number }[]
}

export function KolDirectory({ kols, categories }: { kols: PublicKolCard[]; categories: string[] }) {
  const [category, setCategory] = useState("all")
  const [query, setQuery] = useState("")
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return kols.filter(
      (k) =>
        (category === "all" || k.expertise.includes(category)) &&
        (!q || [k.name, k.title, k.organization, ...k.expertise].join(" ").toLowerCase().includes(q)),
    )
  }, [kols, category, query])

  return (
    <section className="vaap-container pb-16 pt-6 md:pb-20" aria-labelledby="kol-list-heading">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <h2 id="kol-list-heading" className="font-serif text-3xl font-bold text-heading md:text-4xl">
            Our Opinion Leaders
          </h2>
          <span className="h-1 w-16 rounded-full bg-green" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex text-sm text-body">
          <span className="sr-only">Filter by category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 w-full min-w-48 rounded-full border border-line bg-card px-4 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="relative flex text-sm">
          <span className="sr-only">Search opinion leaders</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-body" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search KOLs..."
            className="h-11 w-full rounded-full border border-line bg-card pl-10 pr-4 text-sm text-heading placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
          />
        </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line bg-surface p-10 text-center text-body">
          {kols.length === 0
            ? "Our first Verified Opinion Leaders will be announced soon."
            : "No opinion leaders match your filters."}
        </p>
      ) : (
        <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((k) => (
            <li key={k.slug}>
              <KolCard kol={k} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function KolCard({ kol }: { kol: PublicKolCard }) {
  const top = [...kol.platforms].sort((a, b) => b.followers - a.followers).slice(0, 3)
  return (
    <article className="flex h-full flex-col gap-5 rounded-2xl border border-line-light bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-surface xl:size-24">
          {kol.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={kol.photo} alt={`Portrait of ${kol.name}`} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-2">
              <UserRound className="size-10" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="flex min-w-0 items-start gap-1.5 text-lg font-bold leading-snug text-heading">
              <span className="text-pretty">{kol.name}</span>
              <VerifiedBadge className="mt-0.5" />
            </h3>
            {kol.expertise[0] ? (
              <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-green">
                {kol.expertise[0]}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-body">
            {[kol.title, kol.organization].filter(Boolean).join(", ")}
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-line-light pt-3">
        <p className="text-xs font-medium text-body">Social Reach</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {top.map((p, i) => (
              <li key={`${p.platform}-${i}`} className="flex items-center gap-1.5 text-sm font-semibold text-heading">
                <PlatformIcon platform={p.platform} className="rounded-full" />
                <PlatformName platform={p.platform} />
                {formatCount(p.followers)}
              </li>
            ))}
          </ul>
          <Link
            href={`/membership/verified-opinion-leaders/${kol.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-green hover:text-green-hover"
          >
            View Profile
            <span className="sr-only">of {kol.name}</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

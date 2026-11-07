"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarDays, Newspaper, UserRound } from "lucide-react"
import { NEWS_TABS, newsTabFor, type NewsTab } from "@/lib/news-options"

export type UpdateItem = {
  id: string | number
  title: string
  excerpt: string | null
  image: string | null
  category: string
  publisherName: string | null
  externalUrl: string | null
  createdAt: string
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function LatestUpdates({ items, className }: { items: UpdateItem[]; className?: string }) {
  const [tab, setTab] = useState<NewsTab>("All Updates")

  const counts = useMemo(() => {
    const c = Object.fromEntries(NEWS_TABS.map((t) => [t, 0])) as Record<NewsTab, number>
    c["All Updates"] = items.length
    for (const item of items) c[newsTabFor(item)] += 1
    return c
  }, [items])

  const visible = useMemo(
    () => (tab === "All Updates" ? items : items.filter((i) => newsTabFor(i) === tab)).slice(0, 4),
    [items, tab],
  )
  const [featured, ...rest] = visible

  return (
    <section className={`flex flex-col rounded-2xl border border-line bg-card p-5 ${className ?? ""}`}>
      <div className="flex flex-col gap-4 border-b border-line pb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-heading">
            <Newspaper className="size-5 text-green" aria-hidden />
            Latest Updates
          </h2>
          <Link
            href="/news"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-green hover:text-green-hover"
          >
            View All Updates
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <div role="tablist" aria-label="Filter updates" className="flex gap-2 overflow-x-auto">
          {NEWS_TABS.map((t) => {
            const selected = t === tab
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selected
                    ? "border-green bg-green text-primary-foreground"
                    : "border-line bg-card text-body hover:border-green hover:text-green"
                }`}
              >
                {t}
                <span
                  className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                    selected ? "bg-primary-foreground/20" : "bg-muted text-muted-2"
                  }`}
                >
                  {counts[t]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div role="tabpanel" className="pt-4">
        {!featured && <p className="py-6 text-center text-sm text-muted-2">No {tab.toLowerCase()} yet.</p>}

        {featured && (
          <Link
            href={`/news/${featured.id}`}
            className="group flex flex-col gap-4 rounded-xl border border-line bg-muted/50 p-3 sm:flex-row"
          >
            <span className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-navy sm:w-60">
              {featured.image && <Image src={featured.image} alt="" fill className="object-cover" sizes="240px" />}
              <span className="absolute left-2 top-2 rounded bg-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                Featured
              </span>
            </span>
            <span className="flex min-w-0 flex-col justify-center gap-2 py-1">
              <CategoryTag item={featured} />
              <span className="text-pretty text-base font-bold leading-snug text-heading group-hover:text-green">
                {featured.title}
              </span>
              {featured.excerpt && (
                <span className="line-clamp-2 text-sm leading-relaxed text-body">{featured.excerpt}</span>
              )}
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-2">
                {featured.publisherName && (
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="size-3.5" aria-hidden />
                    {featured.publisherName}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden />
                  {fmtDate(featured.createdAt)}
                </span>
              </span>
            </span>
          </Link>
        )}

        {rest.length > 0 && (
          <ul className="mt-2 flex flex-col divide-y divide-line">
            {rest.map((n) => (
              <li key={n.id}>
                <Link href={`/news/${n.id}`} className="group flex items-center gap-4 py-3">
                  <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-mint">
                    {n.image && <Image src={n.image} alt="" fill className="object-cover" sizes="96px" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="line-clamp-2 text-sm font-bold text-heading group-hover:text-green">
                      {n.title}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-2">
                      <CategoryTag item={n} />
                      {fmtDate(n.createdAt)}
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
      </div>
    </section>
  )
}

function CategoryTag({ item }: { item: UpdateItem }) {
  return (
    <span className="w-fit rounded-md bg-mint px-2 py-0.5 text-[11px] font-semibold text-green">
      {item.category || newsTabFor(item)}
    </span>
  )
}

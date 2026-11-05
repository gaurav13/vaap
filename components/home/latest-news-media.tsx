"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, ExternalLink, Newspaper } from "lucide-react"
import { NEWS_TABS, newsTabFor, type NewsTab } from "@/lib/news-options"
import { cn } from "@/lib/utils"

export type HomeNewsItem = {
  id: number
  title: string
  category: string
  excerpt: string
  image: string | null
  publisherName: string
  publisherLogo: string | null
  externalUrl: string | null
  createdAt: string
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "Asia/Karachi",
  })
}

function readLabel(item: HomeNewsItem) {
  if (item.externalUrl && item.publisherName) return `Read on ${item.publisherName}`
  return "Read more"
}

function ReadLink({ item, className }: { item: HomeNewsItem; className?: string }) {
  const base = cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-green px-5 py-2 text-sm font-semibold text-green transition-colors hover:bg-green hover:text-primary-foreground",
    className,
  )
  if (item.externalUrl) {
    return (
      <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className={base}>
        {readLabel(item)}
        <ExternalLink className="size-4" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    )
  }
  return (
    <Link href={`/news/${item.id}`} className={base}>
      {readLabel(item)}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  )
}

function PublisherMark({ item, size }: { item: HomeNewsItem; size: "lg" | "sm" }) {
  if (item.publisherLogo) {
    return (
      <img
        src={item.publisherLogo || "/placeholder.svg"}
        alt={item.publisherName || "Publisher logo"}
        className={cn("w-auto object-contain", size === "lg" ? "h-14 max-w-40" : "h-8 max-w-28")}
      />
    )
  }
  return (
    <span
      className={cn(
        "font-serif font-bold uppercase leading-none tracking-tight text-heading",
        size === "lg" ? "text-3xl" : "text-2xl",
      )}
    >
      {item.publisherName || "VAAP"}
    </span>
  )
}

export function LatestNewsMedia({ items }: { items: HomeNewsItem[] }) {
  const [tab, setTab] = useState<NewsTab>("All Updates")

  const visible = useMemo(
    () => (tab === "All Updates" ? items : items.filter((i) => newsTabFor(i) === tab)).slice(0, 4),
    [items, tab],
  )
  const [featured, ...rest] = visible

  return (
    <section aria-labelledby="latest-news-heading" className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl border-2 border-green text-green">
            <Newspaper className="size-6" aria-hidden="true" />
          </span>
          <h2 id="latest-news-heading" className="text-3xl font-bold text-heading text-balance md:text-4xl">
            Latest News &amp; Media
          </h2>
          <span aria-hidden="true" className="hidden h-0.5 w-24 bg-green xl:block" />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div role="tablist" aria-label="Filter news" className="flex flex-wrap gap-2">
            {NEWS_TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  tab === t ? "bg-green text-primary-foreground" : "bg-muted text-heading hover:bg-mint",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-sm font-semibold text-green transition-colors hover:text-green-hover"
          >
            View All News <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {!featured ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-card p-10 text-center text-sm text-muted-2">
          No updates in this category yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm md:flex-row">
            <div className="relative aspect-video overflow-hidden bg-muted md:order-last md:aspect-auto md:w-1/2 md:shrink-0">
              <img
                src={featured.image || "/images/news-skyline.png"}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-xl"
              />
              <img
                src={featured.image || "/images/news-skyline.png"}
                alt=""
                className="absolute inset-0 size-full object-contain"
              />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PublisherMark item={featured} size="sm" />
                <ReadLink item={featured} className="px-4 py-1.5" />
              </div>
              <h3 className="text-xl font-bold leading-snug text-heading text-pretty line-clamp-3">{featured.title}</h3>
              <p className="text-sm leading-relaxed text-body line-clamp-2">{featured.excerpt}</p>
              <div className="mt-auto flex items-center gap-3 text-sm">
                <CalendarDays className="size-4 text-green" aria-hidden="true" />
                <time dateTime={featured.createdAt} className="text-muted-2">
                  {formatDate(featured.createdAt)}
                </time>
                <span aria-hidden="true" className="h-4 w-px bg-line" />
                <span className="font-semibold text-green">{featured.category}</span>
              </div>
            </div>
          </article>

          <div className="flex flex-col gap-4">
            {rest.length === 0 ? (
              <p className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-line bg-card p-8 text-sm text-muted-2">
                More updates coming soon.
              </p>
            ) : (
              rest.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-1 flex-col gap-3 rounded-2xl border border-line bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex w-28 shrink-0 items-center sm:justify-center">
                    <PublisherMark item={item} size="sm" />
                  </div>
                  <span aria-hidden="true" className="hidden h-10 w-0.5 bg-green sm:block" />
                  <h3 className="flex-1 text-base font-bold leading-snug text-heading text-pretty line-clamp-2">
                    {item.title}
                  </h3>
                  <ReadLink item={item} className="px-4 py-1.5" />
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  )
}

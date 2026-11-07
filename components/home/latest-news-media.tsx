"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, ExternalLink, Newspaper } from "lucide-react"
import { NEWS_TABS, newsTabFor, type NewsTab } from "@/lib/news-options"
import { cn } from "@/lib/utils"

export type HomeNewsItem = {
  key: string
  href: string
  title: string
  category: string
  excerpt: string
  image: string | null
  publisherName: string
  authorName?: string | null
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
    <Link href={item.href} className={base}>
      {readLabel(item)}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  )
}

export function LatestNewsMedia({ items }: { items: HomeNewsItem[] }) {
  const [tab, setTab] = useState<NewsTab>("All Updates")

  const visible = useMemo(
    () => (tab === "All Updates" ? items : items.filter((i) => newsTabFor(i) === tab)).slice(0, 2),
    [items, tab],
  )
  const featured = visible[0]

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
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {visible.map((item) => (
            <article
              key={item.key}
              className="flex flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-md"
            >
              <div className="relative aspect-video">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gold"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 88%, 0 100%)" }}
                />
                <div
                  className="absolute inset-0 bg-muted"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(88% - 6px), 0 calc(100% - 6px))" }}
                >
                  <img src={item.image || "/images/news-skyline.png"} alt="" className="size-full object-cover" />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-4 px-6 pb-6 pt-2 lg:px-8 lg:pb-8">
                <div className="flex items-center">
                  <span className="rounded-full bg-green px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-foreground">
                    {item.category}
                  </span>
                  <span aria-hidden="true" className="h-0.5 w-12 bg-green" />
                </div>
                <h3 className="font-serif text-2xl font-bold leading-tight text-heading text-balance line-clamp-3 lg:text-3xl">
                  {item.title}
                </h3>
                <p className="text-base leading-relaxed text-body line-clamp-3">{item.excerpt}</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-5 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="size-5 text-green" aria-hidden="true" />
                      <time dateTime={item.createdAt} className="whitespace-nowrap text-muted-2">
                        {formatDate(item.createdAt)}
                      </time>
                    </span>
                    <span aria-hidden="true" className="h-5 w-px bg-line" />
                    <span className="truncate font-bold text-heading">
                      By {item.authorName || item.publisherName || "VAAP"}
                    </span>
                  </div>
                  <ReadLink
                    item={item}
                    className="border-transparent bg-green px-5 py-2.5 text-primary-foreground shadow-sm hover:bg-green-hover"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

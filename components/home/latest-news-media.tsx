"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Newspaper } from "lucide-react"
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
      <span className="sr-only">: {item.title}</span>
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  )
}

export function LatestNewsMedia({ items }: { items: HomeNewsItem[] }) {
  const [tab, setTab] = useState<NewsTab>("All Updates")

  const visible = useMemo(
    () => (tab === "All Updates" ? items : items.filter((i) => newsTabFor(i) === tab)).slice(0, 12),
    [items, tab],
  )
  const featured = visible[0]
  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  const step = useCallback((dir: 1 | -1) => {
    const track = trackRef.current
    const slide = track?.querySelector<HTMLElement>("[data-slide]")
    if (!track || !slide) return
    const amount = slide.offsetWidth + 20
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
    const atStart = track.scrollLeft <= 4
    if (dir === 1 && atEnd) track.scrollTo({ left: 0 })
    else if (dir === -1 && atStart) track.scrollTo({ left: track.scrollWidth })
    else track.scrollBy({ left: dir * amount })
  }, [])

  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0 })
  }, [tab])

  useEffect(() => {
    if (paused || visible.length <= 1) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(() => step(1), 4000)
    return () => window.clearInterval(id)
  }, [paused, visible.length, step])

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
        <div
          className="relative mt-8"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div
            ref={trackRef}
            aria-roledescription="carousel"
            aria-label="Latest news"
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {visible.map((item) => (
              <article
                key={item.key}
                data-slide
                aria-roledescription="slide"
                className="relative flex w-full shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-shadow hover:shadow-md sm:w-[calc((100%-1.25rem)/2)] md:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3.75rem)/4)]"
              >
                <div className="relative aspect-[2/1]">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gold"
                    style={{ clipPath: "polygon(0 0, 100% 0, 100% 86%, 0 100%)" }}
                  />
                  <div
                    className="absolute inset-0 bg-muted"
                    style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(86% - 4px), 0 calc(100% - 4px))" }}
                  >
                    <Image
                      src={item.image || "/images/news-skyline.png"}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 300px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-1">
                  <span className="self-start rounded-full bg-green px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                    {item.category}
                  </span>
                  <h3 className="font-serif text-base font-bold leading-snug text-heading text-balance line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-body line-clamp-2">{item.excerpt}</p>
                  <div className="mt-auto flex flex-col gap-2.5 border-t border-line pt-2.5 text-xs">
                    <div className="flex min-w-0 items-center gap-3">
                      {item.publisherLogo && !/^vaap$/i.test(item.publisherName?.trim() ?? "") ? (
                        <Image
                          src={item.publisherLogo}
                          alt={item.publisherName || "Media outlet"}
                          width={140}
                          height={28}
                          className="h-7 w-auto max-w-[45%] shrink-0 object-contain object-left"
                        />
                      ) : (
                        <span className="truncate font-bold text-heading">
                          By {item.authorName || item.publisherName || "VAAP"}
                        </span>
                      )}
                      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-line" />
                      <span className="flex min-w-0 items-center gap-1.5">
                        <CalendarDays className="size-4 shrink-0 text-green" aria-hidden="true" />
                        <time dateTime={item.createdAt} className="whitespace-nowrap text-muted-2">
                          {formatDate(item.createdAt)}
                        </time>
                      </span>
                    </div>
                    <ReadLink
                      item={item}
                      className="w-full border-transparent bg-muted-2 px-3 py-1.5 text-xs text-primary-foreground hover:bg-heading hover:text-primary-foreground"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {visible.length > 1 && (
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous news"
                className="flex size-9 items-center justify-center rounded-full border border-line bg-card text-heading transition-colors hover:border-green hover:text-green"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next news"
                className="flex size-9 items-center justify-center rounded-full border border-line bg-card text-heading transition-colors hover:border-green hover:text-green"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

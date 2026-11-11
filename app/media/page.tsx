import Image from "next/image"
import type { Metadata } from "next"
import { ArrowUpRight, PlayCircle } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PageHero } from "@/components/page-hero"
import { getMediaHighlights } from "@/app/actions/cms"
import { getHeaderUser } from "@/lib/header-user"

export const metadata: Metadata = {
  title: "Media & Social Highlights | VAAP",
  description: "Every VAAP TV interview, press conference, podcast, and video, with the latest first.",
  alternates: { canonical: "/media" },
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  })
}

export default async function MediaPage() {
  const [items, user] = await Promise.all([getMediaHighlights(), getHeaderUser()])

  return (
    <>
      <SiteHeaderServer active="Knowledge" user={user} />
      <main>
        <PageHero
          eyebrow="Media"
          title="Media & Social Highlights"
          description="TV interviews, press conferences, podcasts, and videos featuring VAAP, with the latest first."
        />

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-card p-10 text-center text-muted-2">
              No media highlights have been published yet.
            </p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => {
                const body = (
                  <>
                    <div className="relative aspect-video overflow-hidden bg-navy-dark">
                      {m.image ? (
                        <Image
                          src={m.image}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <PlayCircle className="size-10 text-white/40" aria-hidden="true" />
                        </div>
                      )}
                      {m.duration && (
                        <span className="absolute bottom-2 right-2 rounded bg-navy-dark/85 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          {m.duration}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold uppercase tracking-wider text-green">{m.kind}</span>
                        <time dateTime={new Date(m.updatedAt).toISOString()} className="text-muted-2">
                          {formatDate(m.updatedAt)}
                        </time>
                      </div>
                      <h2 className="line-clamp-3 font-bold leading-snug text-heading text-pretty group-hover:text-green">
                        {m.title}
                      </h2>
                      {m.description && (
                        <p className="line-clamp-3 text-sm leading-relaxed text-muted-2">
                          {m.description.replace(/<[^>]*>/g, " ").trim()}
                        </p>
                      )}
                      {m.url && (
                        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-green">
                          Watch
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </>
                )
                const cardClass =
                  "group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
                return (
                  <li key={m.id}>
                    {m.url ? (
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className={cardClass}>
                        {body}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <div className={cardClass}>{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

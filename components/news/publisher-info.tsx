import { ArrowUpRight, CalendarDays, Globe, Newspaper } from "lucide-react"

type Publisher = {
  name: string
  logo: string | null
  url: string
  publishedAt: Date | null
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
}

function PublisherLogo({ name, logo, size }: { name: string; logo: string | null; size: "sm" | "lg" }) {
  const box = size === "lg" ? "h-16 w-28" : "h-8 w-14"
  if (logo) {
    return (
      <span className={`flex ${box} shrink-0 items-center justify-center rounded-lg border border-line bg-card p-1.5`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- publisher logos come from arbitrary hosts */}
        <img src={logo} alt={`${name} logo`} className="max-h-full max-w-full object-contain" />
      </span>
    )
  }
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-lg bg-mint text-green`}
      aria-hidden="true"
    >
      <Newspaper className={size === "lg" ? "size-7" : "size-4"} />
    </span>
  )
}

export function PublisherCredit({ name, logo, url }: Publisher) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-3 self-start rounded-full border border-line bg-card py-1.5 pl-1.5 pr-4 text-sm transition-colors hover:border-green-border"
    >
      <PublisherLogo name={name} logo={logo} size="sm" />
      <span className="text-muted-2">
        Originally published by{" "}
        <span className="font-semibold text-heading transition-colors group-hover:text-green">{name}</span>
      </span>
      <ArrowUpRight className="size-4 text-muted-2 transition-colors group-hover:text-green" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}

export function PublisherInfo({ name, logo, url, publishedAt }: Publisher) {
  return (
    <aside
      aria-labelledby="publisher-info-heading"
      className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line bg-mint/60 px-5 py-3 sm:px-6">
        <h2 id="publisher-info-heading" className="text-xs font-bold uppercase tracking-[0.16em] text-green">
          Source &amp; Publisher
        </h2>
        <span className="rounded-full bg-heading px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-background">
          External
        </span>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start rounded-lg transition-opacity hover:opacity-80 sm:self-center"
          aria-label={`Visit ${name} (opens in a new tab)`}
        >
          <PublisherLogo name={name} logo={logo} size="lg" />
        </a>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-bold text-heading transition-colors hover:text-green"
          >
            {name}
          </a>
          <dl className="flex flex-col gap-1.5 text-sm text-body">
            {publishedAt && (
              <div className="flex items-center gap-2">
                <dt className="sr-only">Original publication date</dt>
                <CalendarDays className="size-4 shrink-0 text-muted-2" aria-hidden="true" />
                <dd>
                  Published <time dateTime={publishedAt.toISOString().slice(0, 10)}>{formatDate(publishedAt)}</time>
                </dd>
              </div>
            )}
            <div className="flex min-w-0 items-center gap-2">
              <dt className="sr-only">Original article URL</dt>
              <Globe className="size-4 shrink-0 text-muted-2" aria-hidden="true" />
              <dd className="min-w-0">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-green underline-offset-4 hover:underline"
                  title={url}
                >
                  {hostOf(url)}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green/90"
        >
          Read Original Article
          <ArrowUpRight className="size-4" aria-hidden="true" />
          <span className="sr-only">on {name} (opens in a new tab)</span>
        </a>
      </div>

      <p className="border-t border-line px-5 py-3 text-xs leading-relaxed text-muted-2 sm:px-6">
        This is a summary of an article originally published by {name}. All rights to the original content belong
        to the publisher.
      </p>
    </aside>
  )
}

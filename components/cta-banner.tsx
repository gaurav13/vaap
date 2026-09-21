import Link from 'next/link'
import { ArrowRight, BarChart3, Lightbulb, ShieldCheck, Users } from 'lucide-react'
import type { CtaBanner as CtaBannerData } from '@/lib/site-settings'

const FEATURE_ICONS = [Users, Lightbulb, BarChart3, ShieldCheck] as const

export function CtaBanner({ data }: { data: CtaBannerData }) {
  if (!data.enabled) return null

  const features = [data.feature1, data.feature2, data.feature3, data.feature4]
    .map((label, i) => ({ label: label?.trim(), Icon: FEATURE_ICONS[i] }))
    .filter((f) => f.label)

  return (
    <section aria-label={data.eyebrow || 'Membership call to action'} className="bg-background">
      <div className="mx-auto max-w-7xl px-5 pb-14 lg:px-8 lg:pb-16">
        <div className="group relative isolate overflow-hidden rounded-2xl bg-navy-dark transition-shadow hover:shadow-2xl">
          {/* Full-bleed overlay link makes the whole banner navigate to the membership page. */}
          <Link
            href={data.bannerHref || '/membership'}
            aria-label={`${data.headingLine1} ${data.headingHighlight}`.trim() || 'Membership'}
            className="absolute inset-0 z-20 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          {/* Photographic backdrop, weighted to the right */}
          {data.image && (
            <img
              src={data.image || '/placeholder.svg'}
              alt={data.imageAlt}
              className="pointer-events-none absolute inset-y-0 right-0 h-full w-full object-cover object-right lg:w-3/4"
            />
          )}
          {/* Directional teal wash keeps the copy legible over the photo */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-navy-dark via-navy-dark/95 to-navy-dark/10 lg:from-navy-dark lg:via-navy-dark/80"
          />

          {/* Top-right eyebrow / statement */}
          <div className="absolute right-6 top-6 z-10 hidden border-l border-gold/60 pl-4 text-right lg:block">
            <p className="text-[10px] font-semibold uppercase leading-relaxed tracking-[0.28em] text-white/80">
              {data.sideLine}
            </p>
            {data.sideStatement && (
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
                {data.sideStatement}
              </p>
            )}
          </div>

          <div className="relative z-10 max-w-2xl px-6 py-10 sm:px-10 lg:py-14">
            {data.eyebrow && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-gold">{data.eyebrow}</span>
                <span className="h-px w-12 bg-gold" aria-hidden="true" />
              </div>
            )}

            <h2 className="mt-5 font-serif text-3xl font-bold leading-tight text-balance text-white sm:text-4xl lg:text-5xl">
              {data.headingLine1}{' '}
              <span className="text-green-light">{data.headingHighlight}</span>
            </h2>

            {data.description && (
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">{data.description}</p>
            )}

            <div className="relative z-30 mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              {data.primaryLabel && (
                <Link
                  href={data.primaryHref || '#'}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-green px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-green-hover"
                >
                  {data.primaryLabel}
                  <ArrowRight className="size-5" />
                </Link>
              )}
              {data.secondaryLabel && (
                <Link
                  href={data.secondaryHref || '#'}
                  className="inline-flex items-center justify-center rounded-lg border border-gold/70 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-gold/10"
                >
                  {data.secondaryLabel}
                </Link>
              )}
            </div>

            {features.length > 0 && (
              <ul className="mt-9 flex flex-wrap gap-x-8 gap-y-4">
                {features.map(({ label, Icon }) => (
                  <li key={label} className="flex items-center gap-2.5">
                    <Icon className="size-5 shrink-0 text-gold" aria-hidden="true" />
                    <span className="text-sm font-medium leading-snug text-white/85">{label}</span>
                  </li>
                ))}
              </ul>
            )}

            {data.tagline && (
              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                {data.tagline}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

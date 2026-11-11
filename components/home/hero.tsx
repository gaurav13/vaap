import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Users, ShieldCheck, TrendingUp, Building2, Globe } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { MediaCoverageSlider, type MediaCoverageItem } from "@/components/home/media-coverage-slider"

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: Users, label: "A United\nIndustry Voice" },
  { icon: ShieldCheck, label: "Responsible\nGrowth" },
  { icon: TrendingUp, label: "A Stronger\nDigital Pakistan" },
]

const STATS: { icon: LucideIcon; value: string; title: string; caption: string }[] = [
  { icon: Users, value: "40M+", title: "Crypto Users", caption: "Across Pakistan" },
  { icon: Building2, value: "200+", title: "Companies & Startups", caption: "Industry engagement" },
  { icon: Globe, value: "Global", title: "Partnerships", caption: "Cross-border opportunities" },
  { icon: TrendingUp, value: "$100B+", title: "Economic Opportunity", caption: "Pakistan's digital economy" },
]

export function Hero({ media = [] }: { media?: MediaCoverageItem[] }) {
  return (
    <section className="relative isolate overflow-hidden bg-navy">
      {/* Full-bleed hero with directional teal overlay (governance style) */}
      <div className="relative flex min-h-[640px] items-center md:min-h-[480px] lg:min-h-[540px]">
        <Image
          src="/images/hero-islamabad.png"
          alt="Faisal Mosque and Margalla hills of Islamabad with the Pakistan national flag at sunrise"
          fill
          priority
          quality={60}
          sizes="100vw"
          className="object-cover object-[68%_center]"
        />

        {/* Directional teal overlay: left dark → right light */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(3,42,46,0.96) 0%, rgba(3,42,46,0.88) 35%, rgba(3,42,46,0.55) 65%, rgba(3,42,46,0.15) 100%)",
          }}
        />
        {/* Extra darkening on mobile for readability */}
        <div aria-hidden className="absolute inset-0 bg-navy-dark/45 md:hidden" />

        <div className="relative mx-auto flex w-full max-w-7xl items-center px-5 py-14 sm:px-8 md:py-16 lg:px-12">
          <div className="w-full md:max-w-[62%] lg:max-w-[48%]">
            <p className="text-sm font-bold uppercase tracking-[0.04em] text-white sm:text-base">
              People <span className="mx-1 text-gold">&bull;</span> Policy{" "}
              <span className="mx-1 text-gold">&bull;</span> Progress
            </p>

            <h1 className="mt-4 text-pretty font-serif text-[2.35rem] font-bold leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              Building Pakistan&apos;s
              <br />
              Digital <span className="text-green">Asset Future</span>
            </h1>

            <p className="mt-5 max-w-[600px] text-pretty text-base leading-relaxed text-white/85 sm:text-[1.15rem]">
              A united industry voice for a transparent, innovative and inclusive digital economy.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/membership"
                className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-lg bg-green px-7 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-[56px]"
              >
                Join VAAP
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/about"
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/5 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10 sm:h-[56px]"
              >
                Learn More<span className="sr-only"> About VAAP</span>
              </Link>
            </div>

            {/* Mobile-only tagline (desktop shows it on the right edge) */}
            <div className="mt-10 flex flex-col gap-3 lg:hidden">
              <span className="h-px w-12 bg-gold" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase leading-[1.9] tracking-[0.22em] text-white/85">
                Real People <span className="mx-1.5 text-gold">&bull;</span> Real Potential{" "}
                <span className="mx-1.5 text-gold">&bull;</span> A Digital Pakistan
              </p>
            </div>

            <ul className="mt-8 grid grid-cols-3 gap-4 border-t border-white/15 pt-8 sm:flex sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-2.5 sm:text-left"
                >
                  <Icon className="size-7 shrink-0 text-green sm:size-6" strokeWidth={1.75} aria-hidden />
                  <span className="whitespace-pre-line text-[11px] font-semibold uppercase leading-tight tracking-wide text-white sm:text-xs">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right-side brand statement (governance left-border style) */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-[54%] top-1/2 hidden -translate-y-1/2 lg:block xl:left-[50%]"
        >
          <div className="border-l-[3px] border-green pl-4">
            <p className="text-base font-medium uppercase leading-[1.45] tracking-wide text-white lg:text-lg">
              <span className="block">Real People</span>
              <span className="block">Real Potential</span>
              <span className="block">A Digital Pakistan</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom: stats band */}
      <div className="relative isolate overflow-hidden border-t border-white/10 bg-navy-dark text-white">
        <Image
          src="/images/stats-landscape.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="-z-10 object-cover object-center opacity-25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-dark/90 via-navy-dark/85 to-navy-dark"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-10 sm:py-12 lg:py-14">
          <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-white/10">
            {STATS.map(({ icon: Icon, value, title, caption }) => (
              <div
                key={title}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 sm:gap-4 sm:p-5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:px-8 lg:first:pl-0 lg:last:pr-0"
              >
                <dt className="flex flex-col items-start gap-2.5 text-[10px] font-semibold uppercase leading-snug tracking-[0.1em] text-white/70 sm:flex-row sm:items-center sm:gap-3 sm:text-xs sm:tracking-[0.14em]">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 sm:size-10">
                    <Icon className="size-4 text-gold sm:size-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="min-h-[2.75em] text-pretty sm:min-h-0">{title}</span>
                </dt>
                <dd className="flex flex-col gap-1.5">
                  <span className="whitespace-nowrap font-sans text-2xl font-bold min-[360px]:text-[1.75rem] leading-none tracking-tight text-white tabular-nums sm:text-4xl lg:text-[2.75rem]">
                    {value}
                  </span>
                  <span className="flex items-start gap-2 text-xs leading-snug text-white/60 sm:items-center sm:text-sm sm:leading-relaxed">
                    <span className="mt-[0.55em] h-px w-3 shrink-0 bg-gold sm:mt-0 sm:w-5" aria-hidden="true" />
                    {caption}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <MediaCoverageSlider items={media} />

          <div className="mt-12 flex items-center gap-4 border-t border-white/10 pt-8">
            <span className="hidden h-px flex-1 bg-gradient-to-r from-transparent to-gold/40 sm:block" aria-hidden="true" />
            <p className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[10px] font-semibold uppercase leading-[1.8] tracking-[0.2em] text-white/80 sm:w-auto sm:gap-x-3 sm:text-xs sm:tracking-[0.28em]">
              <span className="whitespace-nowrap">Real People</span>
              <span className="text-gold" aria-hidden="true">&bull;</span>
              <span className="whitespace-nowrap">Real Potential</span>
              <span className="text-gold" aria-hidden="true">&bull;</span>
              <span className="whitespace-nowrap">A Digital Pakistan</span>
            </p>
            <span className="hidden h-px flex-1 bg-gradient-to-l from-transparent to-gold/40 sm:block" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  )
}

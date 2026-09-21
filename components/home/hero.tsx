import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Users, ShieldCheck, TrendingUp, Building2, Globe } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: Users, label: "A United\nIndustry Voice" },
  { icon: ShieldCheck, label: "Responsible\nGrowth" },
  { icon: TrendingUp, label: "A Stronger\nDigital Pakistan" },
]

const STATS: { icon: LucideIcon; value: string; label: string }[] = [
  { icon: Users, value: "40M+", label: "Crypto Users\nin Pakistan" },
  { icon: Building2, value: "200+", label: "Companies & Startups\n(Industry Engagement)" },
  { icon: Globe, value: "Global", label: "Partnership\nOpportunities" },
  { icon: TrendingUp, value: "A $100B+", label: "Opportunity\nFor Pakistan's Digital Economy" },
]

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-navy">
      {/* Full-bleed hero with directional teal overlay (governance style) */}
      <div className="relative flex min-h-[640px] items-center md:min-h-[480px] lg:min-h-[540px]">
        <Image
          src="/images/hero-islamabad.png"
          alt="Faisal Mosque and Margalla hills of Islamabad with the Pakistan national flag at sunrise"
          fill
          priority
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
                Learn More
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
      <div className="relative isolate overflow-hidden border-t border-gold/15 bg-navy-dark text-white">
        {/* Scenic Pakistan landscape backdrop */}
        <Image
          src="/images/stats-landscape.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="-z-10 object-cover object-center opacity-60"
        />
        {/* Deep teal wash keeps the stats readable over the photo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-dark/85 via-navy-dark/70 to-navy-dark/90"
        />

        <div className="relative mx-auto max-w-7xl px-6 py-12 sm:px-10 lg:py-14">
          <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 md:grid-cols-4 md:divide-x md:divide-gold/30">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div
                key={value}
                className="flex items-center gap-4 md:px-5 md:first:pl-0 md:last:pr-0 lg:px-8"
              >
                <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full ring-1 ring-gold/50 sm:size-16">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-gold/25 via-gold/5 to-transparent"
                  />
                  <Icon className="relative size-6 text-gold sm:size-7" strokeWidth={1.5} />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="whitespace-nowrap font-serif text-3xl font-bold leading-none text-gold sm:text-4xl">
                    {value}
                  </p>
                  <p className="whitespace-pre-line text-sm leading-snug text-white/85">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 text-center">
            <span className="h-px w-12 bg-gold" aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase leading-[1.8] tracking-[0.28em] text-white/90 sm:text-xs">
              Real People <span className="mx-1.5 text-gold">&bull;</span> Real Potential{" "}
              <span className="mx-1.5 text-gold">&bull;</span> A Digital Pakistan
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BarChart3, Network, QrCode, ShieldCheck, Users } from "lucide-react"

const features = [
  { icon: Users, title: "Industry", subtitle: "Representation" },
  { icon: ShieldCheck, title: "Verified", subtitle: "Membership" },
  { icon: Network, title: "Governance", subtitle: "& Committees" },
  { icon: BarChart3, title: "Policy & Research", subtitle: "Advocacy" },
]

const taglines = ["Unifying Industry", "Representing Stakeholders", "Driving Responsible Growth"]

export function MembershipHero() {
  return (
    <section className="bg-white">
      <div className="relative overflow-hidden">
        {/* Desktop photo with curved left edge and green swoosh */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] lg:block" aria-hidden>
          <Image src="/images/hero-islamabad.png" alt="" fill priority className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 via-20% to-transparent" />
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            fill="none"
          >
            <path d="M0 0 H14 C4 30 6 70 30 100 H0 Z" className="fill-white" />
            <path d="M18 100 C55 96 85 70 100 30 V100 Z" className="fill-white" />
            <path d="M22 100 C58 95 86 68 100 26" stroke="#1b4332" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 10 }} />
            <path d="M30 100 C62 94 88 72 100 40" stroke="#2d6a4f" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 3 }} />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-12 lg:pt-12">
          <div className="lg:max-w-[48%]">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-green">
              VAAP Membership Platform For
            </p>

            <h1 className="mt-3 text-balance font-serif text-3xl font-bold leading-[1.1] text-[#1b4332] sm:text-4xl xl:text-5xl">
              Virtual Assets, Blockchain &amp; Digital Economy
            </h1>

            <ul className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-heading sm:text-base">
              {taglines.map((tagline, index) => (
                <li key={tagline} className="flex items-center gap-3">
                  {index > 0 && <span className="size-1.5 rounded-full bg-gold" aria-hidden />}
                  {tagline}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/membership/apply"
                className="inline-flex h-11 items-center justify-center gap-2.5 rounded-lg bg-[#1b4332] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#143728]"
              >
                Become a Member
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/membership/verify"
                className="inline-flex h-11 items-center justify-center gap-2.5 rounded-lg border-2 border-[#1b4332] bg-white px-6 text-sm font-semibold text-[#1b4332] transition-colors hover:bg-[#1b4332]/5"
              >
                <QrCode className="size-4" aria-hidden />
                Verify Membership
              </Link>
            </div>
          </div>

          {/* Mobile / tablet photo */}
          <div className="relative mt-8 aspect-[21/9] overflow-hidden rounded-2xl border border-line lg:hidden">
            <Image
              src="/images/hero-islamabad.png"
              alt="Faisal Mosque framed by the Margalla Hills in Islamabad, Pakistan"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <div className="relative border-y border-line bg-white">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-6 lg:grid-cols-4 lg:px-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <li
                key={feature.title}
                className={`flex items-center gap-3 py-4 lg:py-5 ${index % 2 === 1 ? "pl-5 border-l border-line" : "pr-5"} ${index > 1 ? "border-t border-line lg:border-t-0" : ""} lg:px-6 ${index === 0 ? "lg:pl-0" : "lg:border-l lg:border-line"}`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-[#1b4332]">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="flex flex-col leading-snug">
                  <span className="text-sm font-semibold text-heading">{feature.title}</span>
                  <span className="text-sm text-muted-foreground">{feature.subtitle}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

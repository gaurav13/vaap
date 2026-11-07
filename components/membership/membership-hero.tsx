import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BadgeCheck, BarChart3, Network, QrCode, ShieldCheck, Users } from "lucide-react"

const features = [
  { icon: Users, title: "Industry Representation", description: "One voice for the sector" },
  { icon: ShieldCheck, title: "Verified Membership", description: "QR-verifiable credentials" },
  { icon: Network, title: "Governance & Committees", description: "Elected, accountable leadership" },
  { icon: BarChart3, title: "Policy & Research", description: "Evidence-led advocacy" },
]

const taglines = ["Unifying Industry", "Representing Stakeholders", "Driving Responsible Growth"]

export function MembershipHero() {
  return (
    <section className="border-b border-line bg-card">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-10 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-12">
        <div className="flex flex-col lg:col-span-6">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-green">
            <span className="h-px w-8 bg-gold" aria-hidden />
            VAAP Membership Platform
          </p>

          <h1 className="mt-4 text-balance font-serif text-3xl font-bold leading-tight text-heading sm:text-4xl xl:text-[2.75rem]">
            Virtual Assets, Blockchain &amp; Digital Economy
          </h1>

          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-body">
            The Virtual Asset Industry Alliance of Pakistan brings founders, firms and professionals together to
            shape a trusted, well-regulated digital economy.
          </p>

          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Our mission">
            {taglines.map((tagline) => (
              <li
                key={tagline}
                className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-heading"
              >
                {tagline}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/membership/apply"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-green px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-green-hover"
            >
              Become a Member
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/membership/verify"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-card px-6 text-sm font-semibold text-heading transition-colors hover:border-green hover:text-green"
            >
              <QrCode className="size-4" aria-hidden />
              Verify Membership
            </Link>
          </div>
        </div>

        <div className="relative lg:col-span-6">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line shadow-sm lg:aspect-auto lg:h-[360px]">
            <Image
              src="/images/hero-islamabad.png"
              alt="Faisal Mosque framed by the Margalla Hills in Islamabad, Pakistan"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 shadow-lg sm:left-6">
            <span className="flex size-9 items-center justify-center rounded-full bg-mint text-green">
              <BadgeCheck className="size-5" aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-heading">Officially verified members</span>
              <span className="text-xs text-muted-foreground">Every credential checks against the registry</span>
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-line bg-surface">
        <ul className="mx-auto grid max-w-7xl grid-cols-1 gap-px px-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <li key={feature.title} className="flex items-center gap-3 py-5 lg:px-4 lg:first:pl-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-green ring-1 ring-line">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-heading">{feature.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{feature.description}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  FileText,
  Gem,
  Globe,
  GraduationCap,
  Settings,
  Share2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"

type Benefit = { icon: LucideIcon; title: string; desc: string }

const BENEFITS: Benefit[] = [
  {
    icon: GraduationCap,
    title: "Education & Awareness",
    desc: "Access training, workshops and resources to build knowledge and industry expertise.",
  },
  {
    icon: Users,
    title: "Industry Collaboration",
    desc: "Connect and build with peers across the sector, including exchanges, startups, investors and service providers.",
  },
  {
    icon: FileText,
    title: "Policy Engagement & Advocacy",
    desc: "Be part of a collective industry voice in regulatory dialogue and policy development.",
  },
  {
    icon: BarChart3,
    title: "Research & Insights",
    desc: "Access exclusive reports, market data and analysis to make informed decisions.",
  },
  {
    icon: Share2,
    title: "Events & Networking",
    desc: "Participate in roundtables, forums, conferences and member gatherings.",
  },
  {
    icon: Settings,
    title: "Committees & Working Groups",
    desc: "Contribute to key initiatives and help shape industry standards through active participation.",
  },
  {
    icon: Globe,
    title: "Global Connections",
    desc: "Gain links to international partners, regulators and industry bodies.",
  },
  {
    icon: Gem,
    title: "Exclusive Member Opportunities",
    desc: "Get priority access to programs, partnerships, business opportunities and member-only initiatives.",
  },
]

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: Users, label: "A United Industry Voice" },
  { icon: BarChart3, label: "Greater Opportunities" },
  { icon: ShieldCheck, label: "A Safer & Stronger Ecosystem" },
]

export function MembershipBenefits() {
  return (
    <section className="bg-mint-2">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        {/* Top micro-label */}
        <div className="mb-8 hidden items-center justify-end gap-3 lg:flex">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-body/70">
            Build &middot; Collaborate &middot; Grow
          </p>
          <span className="h-px w-16 bg-gold/60" aria-hidden />
        </div>

        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.6fr] lg:items-start lg:gap-14">
          {/* Intro column */}
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-heading">Membership Benefits</p>
              <span className="h-px w-12 bg-gold" aria-hidden />
            </div>

            <h2 className="mt-6 fluid-h2 font-bold text-balance">
              <span className="text-heading">More Than a Membership. </span>
              <span className="text-green">A Stronger Pakistan.</span>
            </h2>

            <p className="mt-6 max-w-md text-base leading-relaxed text-body text-pretty">
              Join a trusted community to access opportunities, knowledge and connections that help build
              Pakistan&apos;s digital asset ecosystem.
            </p>

            {/* Inline features */}
            <ul className="mt-8 flex flex-col gap-3">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 border-l-2 border-gold/40 pl-4"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
                    <Icon className="size-5" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="text-sm font-semibold leading-snug text-heading">{label}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/membership/apply"
              className="group mt-9 inline-flex items-center gap-2 rounded-lg bg-green px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-hover hover:shadow-md"
            >
              Choose Membership
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Benefit cards */}
          <ul className="grid gap-5 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, title, desc }, i) => (
              <li key={title}>
                <Link
                  href="/membership/apply"
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-green/25 hover:shadow-[0_16px_40px_-12px_rgba(16,24,40,0.18)]"
                >
                  {/* Top hover accent */}
                  <span
                    className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-green to-gold transition-transform duration-300 group-hover:scale-x-100"
                    aria-hidden
                  />

                  <div className="flex items-start justify-between">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-green text-white shadow-sm ring-1 ring-green/20 transition-transform duration-300 group-hover:scale-105">
                      <Icon className="size-6" strokeWidth={1.7} aria-hidden />
                    </span>
                    <span
                      className="font-serif text-3xl font-bold leading-none text-gold/25 transition-colors duration-300 group-hover:text-gold/45"
                      aria-hidden
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-5 font-serif text-lg font-bold leading-snug text-heading text-balance">
                    {title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-body text-pretty">{desc}</p>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-body/50 transition-colors duration-300 group-hover:text-green">
                    Learn more
                    <ArrowRight
                      className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom micro-label */}
        <div className="mt-12 hidden items-center justify-end gap-3 lg:flex">
          <span className="h-px w-16 bg-gold/60" aria-hidden />
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-body/70">
            Together for a Stronger Digital Pakistan
          </p>
        </div>
      </div>
    </section>
  )
}

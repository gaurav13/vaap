import Link from "next/link"
import {
  ArrowRight,
  User,
  UsersRound,
  Briefcase,
  Lightbulb,
  FileText,
  Landmark,
  ShieldCheck,
  BarChart3,
  Scale,
  BadgeCheck,
  TrendingUp,
} from "lucide-react"

const COMMITTEES = [
  { icon: Lightbulb, title: "Startup & Innovation", sub: "Entrepreneurship & Ecosystem Growth" },
  { icon: FileText, title: "Policy, Legal & Regulatory", sub: "Policy Development & Regulatory Engagement" },
  { icon: Landmark, title: "Banking, Payments & Stablecoins", sub: "Financial Infrastructure & Market Development" },
  { icon: ShieldCheck, title: "AML, Compliance & Consumer Protection", sub: "Risk Management & Consumer Safeguards" },
  { icon: UsersRound, title: "Community & Industry Relations", sub: "Member Engagement & Industry Coordination" },
  { icon: BarChart3, title: "Investment & Institutional Development", sub: "Capital Markets & Institutional Participation" },
]

const PRINCIPLES = [
  { icon: ShieldCheck, label: "Transparency", desc: "Open and clear processes in all activities" },
  { icon: Scale, label: "Accountability", desc: "Responsible leadership and decision-making" },
  { icon: BadgeCheck, label: "Integrity", desc: "Upholding the highest ethical standards" },
  { icon: UsersRound, label: "Member Participation", desc: "Inclusive and representative governance" },
  { icon: TrendingUp, label: "Long-Term Impact", desc: "Supporting a sustainable digital asset ecosystem for Pakistan" },
]

/*
 * Each tier spans the full pyramid width and is clipped to its slice, so the
 * slanted edges line up into one continuous pyramid. Mobile uses a flatter
 * taper so labels still fit on narrow screens.
 */
const LEADERSHIP_TIERS = [
  {
    icon: User,
    label: "Chairman",
    className:
      "h-16 bg-green-hover md:h-28 md:justify-end md:pb-4 [clip-path:polygon(26%_0,74%_0,78.84%_100%,21.16%_100%)] md:[clip-path:polygon(48%_0,52%_0,64.68%_100%,35.32%_100%)]",
  },
  {
    icon: UsersRound,
    label: "Senior Vice Chairman",
    className:
      "h-14 bg-green md:h-16 [clip-path:polygon(20.71%_0,79.29%_0,83.53%_100%,16.47%_100%)] md:[clip-path:polygon(34.64%_0,65.36%_0,72.6%_100%,27.4%_100%)]",
  },
  {
    icon: User,
    label: "Vice Chairman",
    className:
      "h-14 bg-green/85 md:h-16 [clip-path:polygon(16.02%_0,83.98%_0,88.21%_100%,11.79%_100%)] md:[clip-path:polygon(26.72%_0,73.28%_0,80.53%_100%,19.47%_100%)]",
  },
]

const ADVISORY_TIERS = [
  {
    icon: UsersRound,
    label: "Advisory Board Members",
    sub: "Strategic Guidance & International Perspective",
    className:
      "[clip-path:polygon(11.34%_0,88.66%_0,94.1%_100%,5.9%_100%)] md:[clip-path:polygon(18.79%_0,81.21%_0,90.26%_100%,9.74%_100%)]",
  },
  {
    icon: Briefcase,
    label: "Industry Advisor Members",
    sub: "Industry Expertise & Sector Collaboration",
    className:
      "[clip-path:polygon(5.44%_0,94.56%_0,100%_100%,0%_100%)] md:[clip-path:polygon(9.06%_0,90.94%_0,100%_100%,0%_100%)]",
  },
]

function GovernancePyramid() {
  return (
    <ol aria-label="VAAP governance hierarchy" className="mx-auto flex w-full max-w-2xl flex-col gap-1.5">
      {LEADERSHIP_TIERS.map(({ icon: Icon, label, className }) => (
        <li key={label} className={`flex flex-col items-center justify-center gap-1 text-white ${className}`}>
          <Icon className="size-5 shrink-0 md:size-6" strokeWidth={1.75} aria-hidden />
          <span className="text-center text-xs font-bold uppercase tracking-wide md:text-sm">{label}</span>
        </li>
      ))}
      <li className="flex flex-col gap-1.5 drop-shadow-[0_3px_8px_rgba(16,42,54,0.1)]">
        <ol className="flex flex-col gap-1.5">
          {ADVISORY_TIERS.map(({ icon: Icon, label, sub, className }) => (
            <li key={label} className={`flex h-18 items-center justify-center bg-card md:h-20 ${className}`}>
              <span className="flex max-w-[78%] items-center gap-3 md:max-w-[70%] md:gap-4">
                <Icon className="size-6 shrink-0 text-green md:size-8" strokeWidth={1.5} aria-hidden />
                <span>
                  <span className="block text-sm font-bold uppercase leading-tight tracking-wide text-heading md:text-base">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-body text-pretty md:text-sm">{sub}</span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      </li>
    </ol>
  )
}

function CommitteeCard({
  icon: Icon,
  title,
  sub,
}: {
  icon: typeof Lightbulb
  title: string
  sub: string
}) {
  return (
    <li className="relative flex flex-col items-center rounded-xl border border-line bg-card px-3 py-5 text-center shadow-sm transition-shadow hover:shadow-md">
      <span aria-hidden className="absolute -top-4 left-1/2 hidden h-4 w-px -translate-x-1/2 bg-green lg:block" />
      <span className="flex size-11 items-center justify-center rounded-lg bg-mint">
        <Icon className="size-6 text-green" strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className="mt-3 text-sm font-bold leading-snug text-heading text-balance">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-body text-pretty">{sub}</p>
    </li>
  )
}

export function VaapGovernance() {
  return (
    <section className="bg-mint-2">
      <div className="mx-auto grid max-w-[1440px] gap-y-10 px-6 py-14 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-0 lg:px-16 lg:py-16">
        {/* Left: narrative */}
        <div className="order-1 lg:col-span-3">
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-green">VAAP Governance</p>
            <span aria-hidden className="h-0.5 w-9 bg-green" />
          </div>
          <h2 className="mt-4 text-pretty font-serif text-3xl font-bold leading-[1.1] tracking-tight text-heading lg:text-[2.5rem]">
            Our Governance Structure
          </h2>
          <span aria-hidden className="mt-5 block h-1 w-14 rounded-full bg-green" />
          <p className="mt-5 max-w-md text-pretty text-[17px] leading-relaxed text-body">
            {"A member-driven, transparent and inclusive governance structure to represent, coordinate and advance Pakistan's virtual asset industry."}
          </p>
          <Link
            href="/membership"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
          >
            Join VAAP
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {/* Center: pyramid */}
        <div className="order-2 flex flex-col items-center lg:col-span-6 lg:self-stretch">
          <GovernancePyramid />
          <span aria-hidden className="hidden min-h-6 w-px flex-1 bg-green lg:block" />
        </div>

        {/* Right: principles */}
        <div className="order-4 lg:order-3 lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
            <h3 className="bg-green px-6 py-4 text-center font-serif text-lg font-bold tracking-tight text-white">
              Our Governance Principles
            </h3>
            <ul className="flex flex-col divide-y divide-line px-6 py-2">
              {PRINCIPLES.map(({ icon: Icon, label, desc }) => (
                <li key={label} className="flex gap-3.5 py-3.5">
                  <Icon className="mt-0.5 size-6 shrink-0 text-green" strokeWidth={1.75} aria-hidden />
                  <span>
                    <span className="block text-[15px] font-bold text-heading">{label}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-body text-pretty">{desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom: working groups */}
        <div className="order-3 flex flex-col items-center lg:order-4 lg:col-span-12">
          <h3 className="rounded-xl bg-green-hover px-10 py-3 text-base font-bold uppercase tracking-wide text-white shadow-sm md:px-16 md:text-lg">
            Working Groups
          </h3>
          <div className="relative mt-6 w-full lg:mt-0 lg:pt-8">
            <span aria-hidden className="absolute left-1/2 top-0 hidden h-4 w-px -translate-x-1/2 bg-green lg:block" />
            <span
              aria-hidden
              className="absolute left-[calc((100%_-_5rem)/12)] right-[calc((100%_-_5rem)/12)] top-4 hidden h-px bg-green lg:block"
            />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
              {COMMITTEES.map((c) => (
                <CommitteeCard key={c.title} {...c} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

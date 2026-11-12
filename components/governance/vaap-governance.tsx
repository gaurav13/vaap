import Link from "next/link"
import {
  ArrowRight,
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
  { icon: TrendingUp, label: "Long-Term Impact", desc: "A sustainable digital asset ecosystem for Pakistan" },
]

const TIERS = [
  { label: "Chairman", tone: "lead", width: "w-[62%] md:w-[40%]", bg: "bg-green-hover" },
  { label: "Senior Vice Chairman", tone: "lead", width: "w-[74%] md:w-[55%]", bg: "bg-green" },
  { label: "Vice Chairman", tone: "lead", width: "w-[84%] md:w-[70%]", bg: "bg-green/85" },
  {
    icon: UsersRound,
    label: "Advisory Board Members",
    sub: "Strategic Guidance & International Perspective",
    tone: "advisory",
    width: "w-[92%] md:w-[85%]",
  },
  {
    icon: Briefcase,
    label: "Industry Advisor Members",
    sub: "Industry Expertise & Sector Collaboration",
    tone: "advisory",
    width: "w-full",
  },
] as const

function GovernanceHierarchy() {
  return (
    <ol aria-label="VAAP governance hierarchy" className="flex flex-col items-center gap-1.5">
      {TIERS.map((tier) => {
        if (tier.tone === "lead") {
          return (
            <li
              key={tier.label}
              className={`flex h-11 items-center justify-center rounded-md px-3 text-white ${tier.bg} ${tier.width}`}
            >
              <span className="text-xs font-bold uppercase tracking-wider md:text-[13px]">{tier.label}</span>
            </li>
          )
        }
        const Icon = tier.icon
        return (
          <li
            key={tier.label}
            className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md border border-line bg-card px-3 py-2 text-center md:flex-row md:gap-2.5 ${tier.width}`}
          >
            <span className="flex items-center gap-2">
              <Icon className="size-4 shrink-0 text-green" strokeWidth={2} aria-hidden />
              <span className="text-xs font-bold uppercase tracking-wider text-heading md:text-[13px]">
                {tier.label}
              </span>
            </span>
            <span aria-hidden className="hidden h-3.5 w-px bg-line md:block" />
            <span className="text-xs leading-snug text-body">{tier.sub}</span>
          </li>
        )
      })}
    </ol>
  )
}

function CommitteeCard({ icon: Icon, title, sub }: { icon: typeof Lightbulb; title: string; sub: string }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-line bg-card p-3.5 transition-colors hover:border-green/40">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-mint">
        <Icon className="size-[18px] text-green" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0">
        <h4 className="text-sm font-bold leading-snug text-heading text-pretty">{title}</h4>
        <p className="mt-0.5 text-xs leading-relaxed text-body text-pretty">{sub}</p>
      </span>
    </li>
  )
}

export function VaapGovernance() {
  return (
    <section className="bg-mint-2">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:py-16">
        <div className="flex flex-col lg:col-span-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-green">VAAP Governance</p>
          <h2 className="mt-3 text-pretty font-serif text-3xl font-bold leading-tight tracking-tight text-heading">
            Our Governance Structure
          </h2>
          <p className="mt-3 text-pretty text-[15px] leading-relaxed text-body">
            {"A member-driven, transparent and inclusive structure to represent, coordinate and advance Pakistan's virtual asset industry."}
          </p>
          <Link
            href="/membership"
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-md bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
          >
            Join VAAP
            <ArrowRight className="size-4" aria-hidden />
          </Link>

          <div className="mt-8 border-t border-line pt-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-heading">Governance Principles</h3>
            <ul className="mt-4 flex flex-col gap-3.5">
              {PRINCIPLES.map(({ icon: Icon, label, desc }) => (
                <li key={label} className="flex gap-3">
                  <Icon className="mt-0.5 size-[18px] shrink-0 text-green" strokeWidth={1.75} aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-heading">{label}</span>
                    <span className="block text-[13px] leading-snug text-body text-pretty">{desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-8">
          <GovernanceHierarchy />

          <div className="flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-heading">Working Groups</h3>
              <span className="text-xs text-body">6 focus areas</span>
            </div>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
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

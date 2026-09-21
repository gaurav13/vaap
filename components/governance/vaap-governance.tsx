import Link from "next/link"
import {
  ArrowRight,
  User,
  UsersRound,
  Settings,
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
    <div className="rounded-xl border border-line bg-card p-4 transition-shadow hover:shadow-md">
      <Icon className="size-6 text-green" strokeWidth={1.75} aria-hidden />
      <h3 className="mt-3 font-sans text-sm font-bold leading-snug text-heading text-pretty">{title}</h3>
      <p className="mt-1 text-xs leading-snug text-body text-pretty">{sub}</p>
    </div>
  )
}

export function VaapGovernance() {
  return (
    <section className="bg-mint-2">
      <div className="mx-auto grid max-w-[1440px] items-start gap-10 px-6 py-14 lg:grid-cols-12 lg:gap-8 lg:px-16 lg:py-16">
        {/* Left: narrative */}
        <div className="relative lg:col-span-3">
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-green">VAAP Governance</p>
            <span aria-hidden className="h-0.5 w-9 bg-green" />
          </div>
          <h2 className="mt-4 text-pretty font-serif text-3xl font-bold leading-[1.12] tracking-tight text-heading lg:text-[2.5rem]">
            How the National Industry Representative Is Governed
          </h2>
          <p className="mt-4 max-w-md text-pretty text-[17px] leading-relaxed text-body">
            VAAP uses a member-driven governance structure to provide organized, transparent and accountable industry
            representation.
          </p>
          <Link
            href="/membership"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-green px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
          >
            Join VAAP
            <ArrowRight className="size-4" />
          </Link>

          {/* Tagline */}
          <div className="mt-10 hidden lg:block">
            <p className="pl-2 text-lg font-extrabold leading-tight tracking-tight text-heading/85">
              PEOPLE.
              <br />
              INDUSTRY.
              <br />
              INNOVATION.
              <br />
              A STRONGER
              <br />
              PAKISTAN.
            </p>
          </div>
        </div>

        {/* Center: org chart */}
        <div className="lg:col-span-6">
          <div className="mx-auto flex max-w-2xl flex-col items-center">
            {/* Chairman */}
            <div className="flex w-full max-w-[380px] items-center gap-3 rounded-xl border border-green-border bg-card px-6 py-4">
              <User className="size-6 shrink-0 text-green" strokeWidth={1.75} aria-hidden />
              <span className="text-sm font-bold uppercase tracking-wide text-heading">Chairman</span>
            </div>

            <span aria-hidden className="h-5 w-px bg-line" />

            {/* Executive Committee */}
            <div className="flex w-full max-w-[420px] items-center gap-3 rounded-xl bg-teal px-6 py-4 shadow-sm">
              <UsersRound className="size-7 shrink-0 text-white" strokeWidth={1.75} aria-hidden />
              <span>
                <span className="block text-[15px] font-bold uppercase tracking-wide text-white">
                  Executive Committee
                </span>
                <span className="block text-xs text-white/75">Leadership &amp; Oversight</span>
              </span>
            </div>

            <span aria-hidden className="h-5 w-px bg-line" />

            {/* Specialized Committees */}
            <div className="flex w-full max-w-[420px] items-center gap-3 rounded-xl border border-line bg-card px-6 py-4 shadow-sm">
              <Settings className="size-7 shrink-0 text-green" strokeWidth={1.75} aria-hidden />
              <span>
                <span className="block text-[15px] font-bold uppercase tracking-wide text-heading">
                  Specialized Committees
                </span>
                <span className="block text-xs text-body">Focus Areas &amp; Working Groups</span>
              </span>
            </div>

            {/* Branch connector */}
            <div aria-hidden className="relative hidden h-6 w-full sm:block">
              <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-line" />
              <span className="absolute left-[16.666%] right-[16.666%] top-3 h-px bg-line" />
              <span className="absolute left-[16.666%] top-3 h-3 w-px bg-line" />
              <span className="absolute left-1/2 top-3 h-3 w-px -translate-x-1/2 bg-line" />
              <span className="absolute right-[16.666%] top-3 h-3 w-px bg-line" />
            </div>
            <span aria-hidden className="h-5 w-px bg-line sm:hidden" />

            {/* Committee grid */}
            <div className="grid w-full gap-3 sm:grid-cols-3">
              {COMMITTEES.map((c) => (
                <CommitteeCard key={c.title} {...c} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: principles */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-line bg-card p-6 lg:p-7">
            <h3 className="font-serif text-xl font-bold tracking-tight text-heading">Our Governance Principles</h3>
            <ul className="mt-6 space-y-6">
              {PRINCIPLES.map(({ icon: Icon, label, desc }) => (
                <li key={label} className="flex gap-3.5">
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
      </div>
    </section>
  )
}

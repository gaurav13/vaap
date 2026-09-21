import Link from "next/link"
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  IdCard,
  FileText,
  Globe,
  type LucideIcon,
} from "lucide-react"

type EligibilityCard = {
  icon: LucideIcon
  step: string
  title: string
  subtitle: string
  points: string[]
}

const ELIGIBILITY: EligibilityCard[] = [
  {
    icon: IdCard,
    step: "01",
    title: "Pakistani Individuals",
    subtitle: "Building a Stronger Community",
    points: [
      "A valid CNIC/NIC is required to apply for individual memberships.",
      "Individual, Community and Student Members do not have voting rights.",
    ],
  },
  {
    icon: Building2,
    step: "02",
    title: "Corporate Members",
    subtitle: "Pakistan's Industry at the Core",
    points: [
      "Pakistan-registered entities with a valid NTN and active business in blockchain, virtual assets or related services are eligible to participate in VAAP governance and vote.",
    ],
  },
  {
    icon: Globe,
    step: "03",
    title: "International Companies",
    subtitle: "Global Collaboration, Local Impact",
    points: [
      "May join as Associate Members.",
      "Generally non-voting, unless they have a Pakistan-registered entity with a valid NTN and meet eligibility criteria for Corporate Membership.",
    ],
  },
  {
    icon: FileText,
    step: "04",
    title: "Voting Rights",
    subtitle: "Transparency & Good Governance",
    points: [
      "Voting rights are reserved for eligible Pakistan-based industry members (e.g. Corporate Members).",
      "Subject to verification, active membership, good standing and VAAP's governing documents.",
    ],
  },
]

export function MembershipEligibility() {
  return (
    <section id="eligibility" className="scroll-mt-24">
      {/* Eligibility */}
      <div className="relative overflow-hidden bg-background">
        {/* faint Pakistan map watermark echoing the mockup */}
        <img
          src="/images/pakistan-map-soft.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 w-52 select-none opacity-30 sm:w-72 md:right-[4%] md:top-[2%] md:w-[360px] md:opacity-40 lg:w-[420px]"
        />
        <span
          className="pointer-events-none absolute right-[-10%] top-[-30%] hidden size-[560px] rounded-full border border-gold/10 md:block"
          aria-hidden
        />

        {/* People/Policy block — top-right over watermark on mobile */}
        <div className="absolute right-5 top-12 z-10 flex items-start gap-3 md:hidden">
          <p className="font-sans text-[10px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-heading">
            People.
            <br />
            Policy.
            <br />
            Innovation.
            <br />A Stronger
            <br />
            Pakistan.
          </p>
          <span className="mt-0.5 h-24 w-px shrink-0 bg-gold" aria-hidden />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-8 md:grid-cols-[1.55fr_1fr] md:items-start">
            {/* Heading */}
            <div>
              <div className="flex items-center gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">
                  Membership &amp; Voting Eligibility
                </p>
                <span className="h-px w-16 bg-gold/50" aria-hidden />
              </div>
              <h2 className="mt-6 max-w-[78%] font-serif text-[clamp(1.9rem,1.1rem+2.6vw,3.25rem)] font-bold leading-[1.12] text-heading text-balance sm:max-w-none">
                <span className="text-green">Clear Rules.</span> Strong Governance. Stronger Industry Representation.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-body text-pretty">
                VAAP is a member-driven organization. Voting rights are reserved for eligible Pakistan-based industry
                members.
              </p>

              {/* View Full Policy — inline on mobile */}
              <Link
                href="/governance"
                className="group mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-gold/60 bg-card px-6 py-3 text-sm font-semibold text-gold shadow-sm transition-all hover:bg-gold hover:text-white hover:shadow-md md:hidden"
              >
                View Full Policy
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Right decorative column — desktop only */}
            <div className="hidden flex-col items-end gap-8 text-right md:flex">
              <Link
                href="/governance"
                className="group inline-flex items-center justify-center gap-2 rounded-lg border border-gold/60 bg-card px-6 py-3 text-sm font-semibold text-gold shadow-sm transition-all hover:bg-gold hover:text-white hover:shadow-md"
              >
                View Full Policy
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <div className="flex items-start gap-4 lg:flex-row-reverse">
                <p className="font-sans text-sm font-semibold uppercase leading-relaxed tracking-[0.22em] text-heading">
                  People.
                  <br />
                  Policy.
                  <br />
                  Innovation.
                  <br />A Stronger
                  <br />
                  Pakistan.
                </p>
                <span className="mt-1 h-32 w-px shrink-0 bg-gold" aria-hidden />
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold/80">
                A United Ecosystem
                <br />
                For Pakistan&apos;s Digital Future
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {ELIGIBILITY.map(({ icon: Icon, step, title, subtitle, points }) => (
              <div
                key={title}
                className="group relative flex flex-row items-start gap-4 overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-green-border/50 hover:shadow-xl sm:flex-col sm:gap-0 sm:p-7"
              >
                {/* top accent bar on hover */}
                <span
                  className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-green transition-transform duration-300 group-hover:scale-x-100"
                  aria-hidden
                />

                {/* icon */}
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-green/10 text-green ring-1 ring-inset ring-green/15 transition-colors group-hover:bg-green group-hover:text-white group-hover:ring-green sm:size-16">
                  <Icon className="size-7 sm:size-8" strokeWidth={1.75} />
                </span>

                {/* desktop step number — top-right */}
                <span className="absolute right-7 top-7 hidden font-sans text-sm font-semibold text-green/30 sm:block">
                  {step}
                </span>

                {/* content */}
                <div className="min-w-0 flex-1 sm:mt-6 sm:w-full">
                  {/* mobile step number + rule */}
                  <div className="flex items-center gap-3 sm:hidden">
                    <span className="font-sans text-sm font-semibold text-green/40">{step}</span>
                    <span className="h-px w-8 bg-green/30" aria-hidden />
                  </div>

                  <h3 className="mt-2 font-serif text-xl font-bold leading-tight text-heading sm:mt-0 sm:text-2xl">
                    {title}
                  </h3>
                  <p className="mt-2 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-green/80 sm:block">
                    {subtitle}
                  </p>
                  <span className="mt-4 hidden h-0.5 w-10 rounded-full bg-green/40 sm:block" aria-hidden />

                  <ul className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                    {points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm leading-relaxed text-body">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green/10 text-green ring-1 ring-inset ring-green/20">
                          <Check className="size-3" strokeWidth={3} aria-hidden />
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* mobile chevron */}
                <span className="flex size-9 shrink-0 items-center justify-center self-center rounded-full bg-green/10 text-green sm:hidden">
                  <ChevronRight className="size-4" aria-hidden />
                </span>
              </div>
            ))}
          </div>

          {/* United ecosystem footer — mobile */}
          <div className="mt-10 flex items-center justify-center gap-4 md:hidden">
            <span className="h-px w-10 bg-gold/40" aria-hidden />
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/80">
              A United Ecosystem For Pakistan&apos;s Digital Future
            </p>
            <span className="h-px w-10 bg-gold/40" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  )
}

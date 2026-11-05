import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  FileText,
  Building2,
  GraduationCap,
  Lightbulb,
  Globe,
  ShieldCheck,
  BookOpen,
  BarChart3,
  Cog,
  Handshake,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const PILLARS: { icon: LucideIcon; label: string }[] = [
  { icon: Handshake, label: "Engagement with Relevant Regulators" },
  { icon: ShieldCheck, label: "Policy & Framework Development" },
  { icon: Users, label: "Industry & Investor Representation" },
]

const FOCUS: { icon: LucideIcon; label: string }[] = [
  { icon: FileText, label: "Policy & Regulatory Engagement" },
  { icon: Building2, label: "Industry Representation" },
  { icon: GraduationCap, label: "Education & Awareness" },
  { icon: Lightbulb, label: "Innovation & Startup Support" },
  { icon: Globe, label: "Global Collaboration" },
  { icon: ShieldCheck, label: "Consumer Protection & Safety" },
  { icon: BookOpen, label: "Research & Knowledge" },
  { icon: BarChart3, label: "A Stronger Digital Pakistan" },
]

export function Legitimacy() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8 lg:py-16">
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-4">
          <span className="h-px w-10 bg-gold" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-heading">Our Focus Areas</span>
          <span className="h-px w-10 bg-gold" aria-hidden="true" />
        </div>

        {/* Heading + description */}
        <h2 className="mx-auto mt-6 text-center font-serif text-2xl font-bold leading-[1.12] text-navy text-balance md:whitespace-nowrap md:text-[1.75rem] lg:text-3xl xl:text-4xl">
          Shaping a Secure, Innovative and Inclusive Digital Economy
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-center leading-relaxed text-body text-pretty">
          We represent the collective interests of Pakistan&apos;s virtual asset and blockchain industry, working to
          promote a transparent, responsible and globally connected ecosystem.
        </p>

        {/* Focus area cards */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {FOCUS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-start gap-3 rounded-xl border border-line bg-card p-4 text-center transition-all hover:-translate-y-1 hover:border-green-border hover:shadow-[0_16px_36px_-22px_rgba(0,168,107,0.5)]"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-mint text-green">
                <Icon className="size-5" />
              </span>
              <span className="font-sans text-[13px] font-semibold leading-snug text-navy">{label}</span>
            </div>
          ))}
        </div>

        {/* Industry platform card */}
        <div className="mt-12 grid items-center gap-x-12 gap-y-10 lg:grid-cols-[1fr_1.15fr]">
          {/* Left copy */}
          <div>
            <h3 className="text-3xl font-bold leading-[1.1] tracking-tight text-navy text-balance lg:text-[2.6rem]">
              Building Pakistan&apos;s Unified Virtual Asset Industry Platform
            </h3>
            <span className="mt-6 block h-1.5 w-20 rounded-full bg-green" aria-hidden="true" />
            <p className="mt-6 max-w-xl leading-relaxed text-body text-pretty">
              The Virtual Asset Industry Alliance of Pakistan (VAAP) is an industry-led initiative to strengthen
              Pakistan&apos;s digital asset ecosystem through investor protection, cybersecurity awareness, industry
              representation, and collaboration with relevant stakeholders and regulatory authorities.
            </p>
            <Link
              href="/about"
              className="group mt-8 inline-flex items-center gap-2 rounded-md bg-green px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-green-hover"
            >
              Learn More About VAAP
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Industry development panel */}
          <div className="relative overflow-hidden rounded-3xl border border-green-border/60 bg-mint-2">
            <div className="relative z-10 grid gap-8 p-7 pb-36 sm:grid-cols-[1.25fr_1fr] sm:gap-0 sm:pb-40 lg:p-9 lg:pb-44">
              <div className="sm:pr-7">
                <span className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-xs font-bold uppercase tracking-wide text-green">
                  <Cog className="size-4" aria-hidden="true" />
                  Industry Development
                </span>
                <h4 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-navy text-balance lg:text-[1.75rem]">
                  Industry Development &amp; Regulatory Alignment
                </h4>
                <p className="mt-4 text-sm leading-relaxed text-body text-pretty">
                  VAAP is working toward establishing a structured industry representation framework in Pakistan,
                  subject to applicable regulatory requirements and approvals.
                </p>
              </div>

              <ul className="flex flex-col justify-center gap-4 border-t border-line pt-6 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0">
                {PILLARS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-card text-green shadow-sm">
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-bold leading-snug text-navy">{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Image
              src="/images/pakistan-skyline-green.png"
              alt=""
              width={1584}
              height={656}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-auto w-full mix-blend-multiply"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

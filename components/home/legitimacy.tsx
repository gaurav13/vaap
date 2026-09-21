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
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

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

        {/* Licensing card */}
        <div className="relative mt-12 overflow-hidden rounded-2xl border border-line bg-card">
          <Image
            src="/images/pakistan-skyline-watermark.png"
            alt=""
            width={600}
            height={600}
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 h-full w-auto object-contain object-right opacity-[0.06]"
          />
          <div className="relative grid items-center gap-x-14 gap-y-10 p-8 lg:grid-cols-2 lg:p-12">
            {/* Left copy */}
            <div>
              <h3 className="font-serif text-3xl font-bold leading-[1.08] text-navy text-balance lg:text-4xl">
                A Licensed &amp; Recognized Trade Organization
              </h3>
              <p className="mt-6 max-w-xl leading-relaxed text-body">
                The Virtual Assets Association of Pakistan (VAAP) is a licensed trade organization recognized by the
                Directorate General of Trade Organizations (DGTO), Ministry of Commerce, Government of Pakistan.
              </p>
              <Link
                href="/about"
                className="group mt-8 inline-flex items-center gap-2 rounded-md bg-green px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-green-hover"
              >
                Learn More About VAAP
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* License panel */}
            <div className="grid grid-cols-1 gap-8 rounded-2xl bg-mint-2 p-8 sm:grid-cols-2 sm:gap-0 lg:p-10">
              {/* Emblem + government */}
              <div className="flex flex-col items-center justify-center text-center sm:pr-8">
                <Image
                  src="/pakistan-emblem.webp"
                  alt="State Emblem of Pakistan"
                  width={120}
                  height={120}
                  style={{ height: "auto" }}
                  className="w-24 object-contain"
                />
                <p className="mt-4 text-sm font-bold leading-snug text-heading">
                  Government of Pakistan
                  <br />
                  Ministry of Commerce
                </p>
                <p className="mt-2 font-serif text-2xl font-bold tracking-wide text-navy">DGTO</p>
              </div>

              {/* License details */}
              <div className="flex flex-col justify-center border-t border-line pt-8 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                <h4 className="text-base font-bold text-heading">Licensed by DGTO</h4>
                <p className="mt-3 text-sm leading-relaxed text-body">
                  VAAP is a recognized Trade Organization under the Directorate General of Trade Organizations (DGTO),
                  Ministry of Commerce, Government of Pakistan.
                </p>
                <Link
                  href="/about"
                  className="group mt-5 inline-flex items-center gap-2 text-sm font-bold text-green transition-colors hover:text-green-hover"
                >
                  View License Details
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

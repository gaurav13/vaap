import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BarChart3, Network, QrCode, ShieldCheck, Users } from "lucide-react"

const features = [
  { icon: Users, label: ["Industry", "Representation"] },
  { icon: ShieldCheck, label: ["Verified", "Membership"] },
  { icon: Network, label: ["Governance", "& Committees"] },
  { icon: BarChart3, label: ["Policy, Research", "& Advocacy"] },
]

const taglines = ["Unifying Industry", "Representing Stakeholders", "Driving Responsible Growth"]

export function MembershipHero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Desktop photo with curved left edge and green swoosh */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[56%] lg:block" aria-hidden>
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

      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-6 lg:px-8 lg:pb-12 lg:pt-16">
        <div className="lg:max-w-[46%]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-heading sm:text-sm">
            VAAP Membership Platform For
          </p>

          <h1 className="mt-4 text-balance font-serif text-4xl font-bold leading-[1.05] text-[#1b4332] sm:text-5xl xl:text-6xl">
            Virtual Assets, Blockchain &amp; Digital Economy
          </h1>

          <p className="mt-5 text-pretty text-base leading-relaxed text-heading sm:text-lg">
            {taglines[0]}
            <span className="mx-3 text-line" aria-hidden>
              |
            </span>
            {taglines[1]}
            <br />
            {taglines[2]}
          </p>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/membership/apply"
              className="inline-flex items-center gap-2.5 rounded-lg bg-[#1b4332] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#143728]"
            >
              Become a Member
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/membership/verify"
              className="inline-flex items-center gap-2.5 rounded-lg border-2 border-[#1b4332] bg-white px-6 py-3 text-sm font-semibold text-[#1b4332] transition-colors hover:bg-[#1b4332]/5"
            >
              <QrCode className="size-5" aria-hidden />
              Verify Membership
            </Link>
          </div>
        </div>

        {/* Mobile / tablet photo */}
        <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl border border-line lg:hidden">
          <Image
            src="/images/hero-islamabad.png"
            alt="Faisal Mosque framed by the Margalla Hills in Islamabad, Pakistan"
            fill
            className="object-cover"
          />
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-0 lg:mt-14 lg:max-w-[64%]">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <li
                key={feature.label.join(" ")}
                className={`flex items-center gap-3 sm:px-5 ${index === 0 ? "sm:pl-0" : "sm:border-l sm:border-line"}`}
              >
                <Icon className="size-9 shrink-0 text-[#1b4332]" strokeWidth={1.5} aria-hidden />
                <span className="text-sm font-medium leading-snug text-heading">
                  {feature.label[0]}
                  <br />
                  {feature.label[1]}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

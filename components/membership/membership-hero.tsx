import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Handshake, Users, BarChart3 } from "lucide-react"

const features = [
  { icon: Handshake, label: ["Stronger", "Policy Dialogue"] },
  { icon: Users, label: ["A Safer", "Community"] },
  { icon: BarChart3, label: ["A More Inclusive", "Digital Economy"] },
]

export function MembershipHero() {
  return (
    <section className="relative overflow-hidden bg-[#f5f3ee]">
      {/* Desktop background photo, bleeding to the right edge */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] lg:block">
        <Image
          src="/images/hero-islamabad.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
          aria-hidden
        />
        {/* Fade the photo into the cream panel on its left edge */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#f5f3ee] via-[#f5f3ee]/70 via-25% to-transparent"
          aria-hidden
        />
        {/* Overlay tagline */}
        <div className="absolute left-[14%] top-1/2 flex -translate-y-1/2 items-stretch gap-4">
          <span className="w-[3px] rounded-full bg-gold" aria-hidden />
          <p className="text-sm font-bold uppercase leading-[1.55] tracking-[0.08em] text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)] xl:text-base">
            People.
            <br />
            Policy.
            <br />
            Innovation.
            <br />A Stronger
            <br />
            Pakistan.
          </p>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-0 px-5 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">
        <div className="lg:max-w-xl">
          <div className="flex items-center gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold sm:text-sm">Membership</p>
            <span className="h-px w-12 bg-gold/60 sm:w-16" aria-hidden />
          </div>

          <h1 className="mt-6 text-balance font-serif text-4xl font-bold leading-[1.06] text-navy sm:text-5xl xl:text-6xl">
            Build Together
            <br />A Stronger <span className="text-gold">Digital Pakistan</span>
          </h1>

          <p className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-body">
            Join VAAP and be part of a transparent, innovative and inclusive virtual asset ecosystem.
          </p>

          {/* Feature highlights */}
          <ul className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-0">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <li
                  key={feature.label.join(" ")}
                  className={`flex items-center gap-3 sm:px-5 ${index === 0 ? "sm:pl-0" : ""} ${
                    index > 0 ? "sm:border-l sm:border-line" : ""
                  }`}
                >
                  <Icon className="size-8 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
                  <span className="text-sm font-semibold leading-snug text-heading">
                    {feature.label[0]}
                    <br />
                    {feature.label[1]}
                  </span>
                </li>
              )
            })}
          </ul>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
            <Link
              href="/membership/apply"
              className="inline-flex items-center gap-2.5 rounded-md bg-[#1b4332] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#143728]"
            >
              Become a Member
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#categories"
              className="group inline-flex items-center gap-2 border-b-2 border-heading pb-1 text-sm font-semibold text-heading transition-colors hover:border-gold hover:text-gold"
            >
              Learn More About Membership
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Mobile / tablet photo */}
        <div className="relative mt-10 block lg:hidden">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line shadow-sm">
            <Image
              src="/images/hero-islamabad.png"
              alt="Faisal Mosque framed by the Margalla Hills in Islamabad, Pakistan"
              fill
              className="object-cover"
            />
            <div className="absolute left-5 top-1/2 flex -translate-y-1/2 items-stretch gap-3">
              <span className="w-[3px] rounded-full bg-gold" aria-hidden />
              <p className="text-xs font-bold uppercase leading-[1.55] tracking-[0.08em] text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]">
                People.
                <br />
                Policy.
                <br />
                Innovation.
                <br />A Stronger
                <br />
                Pakistan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

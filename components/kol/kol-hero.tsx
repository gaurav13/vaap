import Link from "next/link"
import { ArrowRight, Check, CircleCheck, Globe2, Handshake, Megaphone, Network, Users } from "lucide-react"
import { VerifiedBadge } from "@/components/kol/kol-ui"
import { formatCount } from "@/lib/kol-shared"

const benefits = ["Industry Visibility", "Media Opportunities", "Policy & Regulatory Engagement", "Global Network"]

export function KolHero({ leaders, reach, sectors }: { leaders: number; reach: number; sectors: number }) {
  const stats = [
    { Icon: Users, value: leaders > 0 ? String(leaders) : "—", label: "Verified Leaders" },
    { Icon: Megaphone, value: reach > 0 ? `${formatCount(reach)}+` : "—", label: "Total Social Reach" },
    { Icon: Network, value: sectors > 0 ? String(sectors) : "—", label: "Industry Sectors" },
    { Icon: Globe2, value: "Local & Global", label: "Ecosystem Presence" },
  ]
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line-light bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/kol-hero-light.png"
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover object-right opacity-40 md:opacity-100"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-surface via-surface/80 to-transparent md:via-surface/40"
          aria-hidden="true"
        />
        <div className="vaap-container flex min-h-80 flex-col justify-center gap-5 py-14 md:min-h-[26rem] md:py-16">
          <p className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.3em] text-heading">
            The Network
            <span className="h-px w-16 bg-green" aria-hidden="true" />
          </p>
          <h1 className="flex flex-wrap items-center gap-3 font-serif text-4xl font-bold leading-tight text-heading text-balance md:text-6xl">
            <span>
              <span className="text-green">Verified</span> Opinion Leaders
            </span>
            <VerifiedBadge className="[&_svg]:size-9 md:[&_svg]:size-12" label="Verified" />
          </h1>
          <p className="max-w-xl border-l-2 border-green pl-5 text-base leading-relaxed text-body text-pretty md:text-lg">
            Recognized industry experts, founders, and thought leaders shaping Pakistan&apos;s virtual asset and
            digital economy.
          </p>
        </div>
      </section>

      <section aria-label="Network at a glance" className="bg-surface">
        <div className="vaap-container py-8 sm:py-12">
          <dl className="grid grid-cols-1 divide-y divide-line-light rounded-2xl border border-line-light bg-card shadow-sm sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:py-6">
            {stats.map(({ Icon, value, label }, i) => (
              <div
                key={label}
                className={[
                  "flex min-w-0 items-center gap-4 px-5 py-4 sm:px-6 sm:py-6 lg:py-0",
                  i % 2 === 1 ? "sm:border-l sm:border-line-light" : "",
                  i >= 2 ? "sm:border-t sm:border-line-light lg:border-t-0" : "",
                  i === 2 ? "lg:border-l lg:border-line-light" : "",
                ].join(" ")}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mint text-green lg:size-12">
                  <Icon className="size-5 lg:size-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="order-2 text-sm leading-snug text-body">{label}</dt>
                  <dd className="order-1 whitespace-nowrap text-xl font-bold leading-tight text-heading lg:text-2xl">
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex flex-col rounded-2xl border border-line-light bg-card shadow-sm">
            <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
              <p className="flex items-center gap-2.5 font-serif text-lg font-bold text-heading">
                <Handshake className="size-6 shrink-0 text-heading" strokeWidth={1.75} aria-hidden="true" />
                Benefits to Join VAAP
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="flex items-center gap-2.5 rounded-full bg-mint py-2 pl-2 pr-4 text-sm font-medium leading-snug text-heading">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green text-card">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  Approval to Mention Verified VAAP KOLs
                </p>
                <Link
                  href="/membership"
                  className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-heading px-5 py-2.5 text-sm font-semibold text-card transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green sm:self-auto"
                >
                  Read More
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-line-light px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm text-heading">
                  <CircleCheck className="size-4.5 shrink-0 text-green" strokeWidth={2} aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}

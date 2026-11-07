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
        <div className="vaap-container flex flex-col gap-3 py-6 sm:py-8">
          <dl className="grid grid-cols-2 rounded-2xl border border-line-light bg-card shadow-sm md:grid-cols-4">
            {stats.map(({ Icon, value, label }, i) => (
              <div
                key={label}
                className={[
                  "flex min-w-0 items-center gap-3 px-4 py-3 md:py-4",
                  i % 2 === 1 ? "border-l border-line-light" : "",
                  i >= 2 ? "border-t border-line-light md:border-t-0" : "",
                  i === 2 ? "md:border-l" : "",
                ].join(" ")}
              >
                <span className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-mint text-green sm:flex lg:size-10">
                  <Icon className="size-4 lg:size-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <dt className="order-2 truncate text-xs leading-snug text-body sm:text-sm">{label}</dt>
                  <dd className="order-1 whitespace-nowrap text-base font-bold leading-tight text-heading sm:text-lg lg:text-xl">
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-3 rounded-2xl border border-line-light bg-card px-4 py-3 shadow-sm md:flex-row md:items-center md:gap-5">
            <p className="flex shrink-0 items-center gap-2 font-serif text-base font-bold text-heading">
              <Handshake className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              Benefits to Join VAAP
            </p>
            <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 md:border-l md:border-line-light md:pl-5">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-1.5 text-sm text-heading">
                  <CircleCheck className="size-4 shrink-0 text-green" strokeWidth={2} aria-hidden="true" />
                  {benefit}
                </li>
              ))}
              <li className="flex items-center gap-1.5 rounded-full bg-mint py-1 pl-1 pr-3 text-sm font-medium text-heading">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green text-card">
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                </span>
                Approval to Mention Verified VAAP KOLs
              </li>
            </ul>
            <Link
              href="/membership"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full bg-heading px-4 py-2 text-sm font-semibold text-card transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green md:self-auto"
            >
              Read More
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

import Link from "next/link"
import { ArrowRight, CircleCheck, Globe2, Handshake, Megaphone, Network, Users } from "lucide-react"
import { VerifiedBadge } from "@/components/kol/kol-ui"
import { formatCount } from "@/lib/kol-shared"

const benefits = [
  { label: "Industry Visibility" },
  { label: "Media Opportunities" },
  { label: "Mention on Social Media", highlight: true },
  { label: "Policy & Regulatory Engagement" },
]

export function KolHero({ leaders, reach, sectors }: { leaders: number; reach: number; sectors: number }) {
  const stats = [
    { Icon: Users, value: leaders > 0 ? String(leaders) : "—", label: "Verified Leaders" },
    { Icon: Megaphone, value: reach > 0 ? `${formatCount(reach)}+` : "—", label: "Total Social Reach" },
    { Icon: Network, value: sectors > 0 ? String(sectors) : "—", label: "Industry Sectors" },
    { Icon: Globe2, value: "Local & Global", label: "Ecosystem Presence" },
  ]
  return (
    <section className="relative isolate overflow-hidden bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/kol-hero-network.png"
        alt=""
        className="absolute inset-x-0 top-0 -z-10 h-full w-full object-cover object-right-top opacity-40 md:h-auto md:min-h-[30rem] md:opacity-100"
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-r from-surface via-surface/70 to-transparent md:via-surface/20"
        aria-hidden="true"
      />

      <div className="vaap-container flex flex-col gap-5 pb-10 pt-10 md:pt-12">
        <div className="flex items-center gap-8">
          <div className="flex min-w-0 flex-col gap-4">
            <p className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.3em] text-heading">
              The Network
              <span className="h-px w-16 bg-green" aria-hidden="true" />
            </p>
            <h1 className="flex flex-wrap items-center gap-3 font-serif text-4xl font-bold leading-tight text-heading text-balance md:text-5xl">
              <span>
                <span className="text-green">Verified</span> Opinion Leaders
              </span>
              <VerifiedBadge className="[&_svg]:size-8 md:[&_svg]:size-10" label="Verified" />
            </h1>
            <p className="max-w-lg border-l-2 border-green pl-5 text-base leading-relaxed text-body text-pretty md:text-lg">
              Recognized industry experts, founders, and thought leaders shaping Pakistan&apos;s virtual asset and
              digital economy.
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-8 lg:flex">
            <span className="h-36 w-px bg-line" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/kol-verified-seal.png"
              alt="KOL Verified seal"
              className="h-36 w-auto mix-blend-multiply"
            />
          </div>
        </div>

        <dl
          aria-label="Network at a glance"
          className="grid grid-cols-2 rounded-2xl border border-line-light bg-card shadow-sm md:grid-cols-4 lg:mr-[12%]"
        >
          {stats.map(({ Icon, value, label }, i) => (
            <div
              key={label}
              className={[
                "flex min-w-0 items-center gap-3 px-4 py-3 md:py-4 lg:px-6",
                i % 2 === 1 ? "border-l border-line-light" : "",
                i >= 2 ? "border-t border-line-light md:border-t-0" : "",
                i === 2 ? "md:border-l" : "",
              ].join(" ")}
            >
              <span className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-navy text-gold sm:flex lg:size-9">
                <Icon className="size-4 lg:size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col">
                <dt className="order-2 truncate text-xs leading-snug text-body sm:text-sm">{label}</dt>
                <dd className="order-1 whitespace-nowrap font-serif text-base font-bold leading-tight text-heading sm:text-lg lg:text-2xl">
                  {value}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-3 rounded-2xl border border-line-light bg-card px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:gap-4 lg:px-5">
          <p className="flex shrink-0 items-center gap-2 font-serif text-base font-bold text-heading">
            <Handshake className="size-6 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            Benefits to Join VAAP
          </p>
          <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-2 xl:flex-nowrap xl:justify-between lg:border-l lg:border-line-light lg:pl-3">
            {benefits.map(({ label, highlight }) =>
              highlight ? (
                <li
                  key={label}
                  className="flex items-center gap-2 whitespace-nowrap rounded-full bg-mint px-3 py-1.5 text-sm font-semibold text-green"
                >
                  <Megaphone className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  {label}
                </li>
              ) : (
                <li key={label} className="flex items-center gap-1.5 whitespace-nowrap px-2 py-1.5 text-sm text-heading">
                  <CircleCheck className="size-4 shrink-0 text-gold" strokeWidth={2} aria-hidden="true" />
                  {label}
                </li>
              ),
            )}
          </ul>
          <Link
            href="/membership"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full border-2 border-gold bg-green px-5 py-2 text-sm font-semibold text-card transition-colors hover:bg-green-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green lg:self-auto"
          >
            Learn More
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

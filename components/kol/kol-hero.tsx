import { Globe2, Megaphone, Network, Users } from "lucide-react"
import { VerifiedBadge } from "@/components/kol/kol-ui"
import { formatCount } from "@/lib/kol-shared"

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
        <div className="vaap-container pt-8 sm:pt-12">
          <dl className="grid grid-cols-2 rounded-2xl border border-line-light bg-card py-2 shadow-sm lg:grid-cols-4 lg:py-7">
            {stats.map(({ Icon, value, label }, i) => (
              <div
                key={label}
                className={[
                  "flex min-w-0 flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:gap-4 sm:px-6 lg:py-0",
                  i % 2 === 0 ? "border-r border-line-light lg:border-r-0" : "",
                  i >= 2 ? "border-t border-line-light lg:border-t-0" : "",
                  i > 0 ? "lg:border-l lg:border-line-light" : "",
                ].join(" ")}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-green sm:size-12">
                  <Icon className="size-5 sm:size-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <dt className="order-2 text-sm leading-snug text-body">{label}</dt>
                  <dd className="order-1 text-xl font-bold leading-tight text-heading text-balance sm:text-2xl">
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  )
}

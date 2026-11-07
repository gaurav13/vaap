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
      <section className="relative isolate overflow-hidden bg-navy-dark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/kol-hero.png"
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover object-right opacity-90"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-dark via-navy-dark/85 to-transparent" aria-hidden="true" />
        <div className="vaap-container flex flex-col gap-5 py-16 md:py-20">
          <p className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.3em] text-card/80">
            Verified Network
            <span className="h-px w-16 bg-green" aria-hidden="true" />
          </p>
          <h1 className="flex flex-wrap items-center gap-3 font-serif text-4xl font-bold text-card text-balance md:text-6xl">
            Verified Opinion Leaders
            <VerifiedBadge className="[&_svg]:size-9 md:[&_svg]:size-11" label="Verified" />
          </h1>
          <p className="max-w-xl border-l-2 border-green pl-5 text-lg leading-relaxed text-card/85 text-pretty">
            Recognized industry experts, founders, and thought leaders shaping Pakistan&apos;s digital assets ecosystem.
          </p>
        </div>
      </section>

      <section aria-label="Network at a glance" className="border-b border-line-light bg-card">
        <dl className="vaap-container grid grid-cols-2 gap-y-6 py-8 lg:grid-cols-4">
          {stats.map(({ Icon, value, label }, i) => (
            <div
              key={label}
              className={`flex items-center gap-4 px-2 lg:px-6 ${i > 0 ? "lg:border-l lg:border-line" : ""}`}
            >
              <Icon className="size-10 shrink-0 text-green" strokeWidth={1.5} aria-hidden="true" />
              <div className="flex flex-col">
                <dt className="order-2 text-sm text-body md:text-base">{label}</dt>
                <dd className="order-1 text-xl font-bold text-heading md:text-2xl">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}

import Image from "next/image"
import { ShieldCheck, Layers, TrendingUp, DatabaseZap, FileSearch, Users } from "lucide-react"

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Investor Protection",
    text: "Safety, awareness and fraud prevention for a trusted market.",
  },
  {
    icon: Layers,
    title: "Industry Coordination",
    text: "Unifying exchanges, companies, investors and ecosystem partners.",
  },
  {
    icon: TrendingUp,
    title: "Ecosystem Development",
    text: "Driving innovation, investment and responsible growth.",
  },
]

const INITIATIVES = [
  {
    icon: DatabaseZap,
    title: "Crypto Data Verification",
    text: "Building a verified and reliable dataset on digital asset users, activity and market exposure in Pakistan.",
  },
  {
    icon: FileSearch,
    title: "Independent Research",
    text: "Generating market insights, trends and risk analysis to support informed decisions and industry growth.",
  },
  {
    icon: Users,
    title: "Consensus & Industry Alignment",
    text: "Bringing together industry, investors, experts and stakeholders to build common standards and actionable recommendations.",
  },
]

export function NationalEcosystem() {
  return (
    <section className="relative isolate overflow-hidden bg-card">
      <Image
        src="/images/framework-flag.png"
        alt=""
        aria-hidden
        width={420}
        height={300}
        className="pointer-events-none absolute -right-10 -top-6 -z-10 hidden w-64 opacity-90 lg:block"
      />
      <Image
        src="/images/framework-skyline.png"
        alt=""
        aria-hidden
        width={1600}
        height={400}
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 w-full opacity-40"
      />

      <div className="mx-auto grid max-w-7xl items-start gap-10 px-5 pb-24 pt-12 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pb-32 lg:pt-16">
        {/* Left: narrative + pillars */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green">
              {"Pakistan's Digital Asset Ecosystem"}
            </p>
            <span aria-hidden className="h-px w-12 bg-green/50" />
          </div>
          <h2 className="mt-4 text-pretty font-serif text-3xl font-bold leading-tight tracking-tight text-heading sm:text-4xl">
            One Ecosystem. Shared Data.
            <br />
            <span className="text-green">Stronger Industry.</span>
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-body">
            A unified industry platform to build a safer, more transparent and inclusive digital asset ecosystem in
            Pakistan.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-line bg-card px-5 pb-7 pt-6 text-center shadow-[0_10px_30px_-20px_rgba(0,52,58,0.35)] transition-all hover:-translate-y-0.5 hover:border-green-border"
              >
                <span className="flex size-16 items-center justify-center rounded-full bg-mint text-green transition-colors group-hover:bg-green group-hover:text-white">
                  <Icon className="size-8" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-4 text-balance font-serif text-lg font-bold leading-snug text-heading">{title}</h3>
                <span aria-hidden className="mt-3 h-0.5 w-8 rounded-full bg-green" />
                <p className="mt-3 text-pretty text-sm leading-relaxed text-body">{text}</p>
                <span
                  aria-hidden
                  className="absolute -bottom-6 -right-6 size-14 rotate-45 bg-green"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: key initiatives */}
        <div className="rounded-3xl border border-green/10 bg-gradient-to-b from-mint to-mint-2 p-5 shadow-[0_24px_60px_-32px_rgba(0,52,58,0.35)] sm:p-7">
          <div className="flex items-center justify-center gap-4">
            <span aria-hidden className="h-px flex-1 max-w-16 bg-green/40" />
            <h3 className="rounded-full bg-green px-6 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-sm">
              Our Key Initiatives
            </h3>
            <span aria-hidden className="h-px flex-1 max-w-16 bg-green/40" />
          </div>

          <ul className="mt-6 flex flex-col gap-4">
            {INITIATIVES.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="grid grid-cols-1 gap-3 rounded-2xl bg-card p-4 shadow-[0_4px_16px_-8px_rgba(0,52,58,0.2)] sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)] sm:items-center sm:gap-0 sm:p-5"
              >
                <div className="flex items-center gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-mint text-green">
                    <Icon className="size-7" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="text-pretty font-serif text-lg font-bold leading-snug text-heading">{title}</p>
                </div>
                <p className="text-pretty text-xs leading-relaxed text-body sm:border-l sm:border-heading/10 sm:pl-5">
                  {text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

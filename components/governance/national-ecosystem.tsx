import Image from "next/image"
import { Users, ShieldCheck, Handshake, ArrowUp, ArrowDown } from "lucide-react"
import { VaapLogo } from "@/components/vaap-logo"

const OUTCOMES = [
  {
    number: "01",
    icon: ShieldCheck,
    label: "Regulatory Clarity",
    title: "A Secure & Responsible Market",
  },
  {
    number: "02",
    icon: Handshake,
    label: "Industry Coordination",
    title: "A Stronger, Unified Industry",
  },
  {
    number: "03",
    icon: Users,
    label: "Ecosystem Development",
    title: "A More Inclusive Digital Economy",
  },
]

function EngagementLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-3">
      <span className="flex flex-col items-center leading-none text-green">
        <ArrowUp className="size-4" />
      </span>
      <span className="text-xs font-bold uppercase tracking-wide text-heading">{label}</span>
      <span className="flex flex-col items-center leading-none text-green">
        <ArrowDown className="size-4" />
      </span>
    </div>
  )
}

export function NationalEcosystem() {
  return (
    <section className="bg-card">
      <div className="mx-auto grid max-w-7xl items-start gap-10 px-5 py-12 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-16">
        {/* Left: narrative + outcomes */}
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green">National Ecosystem</p>
            <span aria-hidden className="h-px w-8 bg-green/50" />
          </div>
          <h2 className="mt-4 text-pretty font-serif text-3xl font-bold leading-tight tracking-tight text-heading sm:text-4xl">
            One Ecosystem. Distinct Roles.
            <br />
            <span className="text-green">Shared Progress.</span>
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-body">
            Pakistan&apos;s virtual asset ecosystem connects regulatory oversight, organized industry representation
            and industry participation.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {OUTCOMES.map(({ number, icon: Icon, label, title }) => (
              <div
                key={number}
                className="group relative flex flex-col rounded-2xl border border-line bg-card p-5 pt-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-0.5 hover:border-green-border hover:shadow-[0_16px_40px_-20px_rgba(0,107,104,0.35)]"
              >
                <span className="absolute left-5 top-5 text-lg font-extrabold text-green">{number}</span>
                <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-mint text-green shadow-[inset_0_0_0_1px_rgba(0,107,104,0.10),0_8px_20px_-12px_rgba(0,107,104,0.5)] ring-1 ring-inset ring-green/10 transition-all duration-300 group-hover:scale-105 group-hover:bg-green group-hover:text-white group-hover:shadow-[0_12px_28px_-14px_rgba(0,107,104,0.6)]">
                  <Icon className="size-9" strokeWidth={1.75} />
                </span>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-wide text-green">{label}</p>
                <p className="mt-1 text-pretty text-base font-extrabold leading-snug text-heading">{title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: ecosystem diagram */}
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-b from-mint via-mint-2 to-card px-5 pb-8 pt-8 shadow-[0_24px_60px_-32px_rgba(0,52,58,0.35)] ring-1 ring-inset ring-green/10 sm:px-7 sm:pb-9 sm:pt-9">
          <Image
            src="/images/pakistan-map-soft.png"
            alt=""
            aria-hidden
            width={320}
            height={320}
            className="pointer-events-none absolute -right-6 top-1/2 -z-10 w-56 -translate-y-1/2 opacity-[0.12]"
          />

          {/* Header pill */}
          <div className="mb-1 flex flex-col items-center">
            <div className="flex flex-col items-center rounded-full bg-[var(--teal)] px-8 py-3 text-center shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wide text-white">Pakistan</span>
              <span className="text-sm font-bold uppercase tracking-wide text-white">Virtual Asset Ecosystem</span>
            </div>
            <span aria-hidden className="h-5 w-px bg-[var(--teal)]/40" />
          </div>

          {/* PVARA */}
          <div className="rounded-2xl bg-blue-tint p-4 shadow-[0_2px_8px_-4px_rgba(30,64,120,0.15)] sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-0">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-green shadow-sm ring-1 ring-inset ring-green/10">
                  <ShieldCheck className="size-6" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-base font-extrabold text-heading">PVARA</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-green">National Regulator</p>
                  <p className="mt-1 text-xs text-body">Regulation &middot; Licensing &middot; Supervision</p>
                </div>
              </div>
              <div className="sm:pl-5 sm:ml-5 sm:border-l sm:border-heading/10">
                <p className="max-w-[13rem] text-xs leading-relaxed text-body">
                  Provides regulatory oversight for Pakistan&apos;s virtual asset sector.
                </p>
              </div>
            </div>
          </div>

          <EngagementLabel label="Structured Engagement" />

          {/* VAAP (highlighted) */}
          <div className="rounded-2xl border-2 border-green bg-mint p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-0">
              <div>
                <VaapLogo className="h-9 w-auto" />
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-green">
                  National Industry Representative
                </p>
                <p className="mt-1 text-xs font-medium text-heading">
                  Industry Voice &middot; Coordination &middot; Engagement
                </p>
              </div>
              <div className="sm:pl-5 sm:ml-5 sm:border-l sm:border-green/20">
                <p className="max-w-[13rem] text-xs leading-relaxed text-body">
                  Provides an organized national platform for industry representation, participation and collaboration.
                </p>
              </div>
            </div>
          </div>

          <EngagementLabel label="Industry Participation" />

          {/* Industry & Community */}
          <div className="rounded-2xl bg-blue-tint p-4 shadow-[0_2px_8px_-4px_rgba(30,64,120,0.15)] sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-0">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-green shadow-sm ring-1 ring-inset ring-green/10">
                  <Users className="size-6" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-base font-extrabold text-heading">Industry &amp; Community</p>
                  <p className="mt-1 text-xs text-body">Companies &middot; Startups &middot; Professionals</p>
                  <p className="text-xs text-body">Ecosystem Participants</p>
                </div>
              </div>
              <div className="sm:pl-5 sm:ml-5 sm:border-l sm:border-heading/10">
                <p className="max-w-[13rem] text-xs leading-relaxed text-body">
                  Drive innovation, build services and contribute to Pakistan&apos;s digital economy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

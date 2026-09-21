import { BadgeCheck, Lightbulb, ShieldCheck } from "lucide-react"

const CARDS = [
  {
    icon: BadgeCheck,
    title: "Verified Members",
    desc: "VAAP verifies membership information and relevant documentation for companies and professionals participating in the association.",
    label: "Membership Verification",
  },
  {
    icon: ShieldCheck,
    title: "Industry Trust",
    desc: "Supporting stronger professional standards, transparency and responsible participation across the industry.",
    label: "Trust & Standards",
  },
  {
    icon: Lightbulb,
    title: "Driving Innovation",
    desc: "Connecting startups, companies, professionals and ecosystem stakeholders to support responsible innovation and new opportunities.",
    label: "Innovation",
  },
]

export function TrustAndInnovation() {
  return (
    <section className="bg-mint-2">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green">Trust & Industry Development</p>
        <h2 className="mt-3 text-pretty text-3xl font-bold tracking-tight text-heading sm:text-4xl">
          Building Trust Across the Ecosystem
        </h2>
        <p className="mt-3 max-w-3xl text-pretty text-base leading-relaxed text-body">
          VAAP supports stronger industry credibility through member verification, professional participation,
          responsible innovation and industry collaboration.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map(({ icon: Icon, title, desc, label }) => (
            <div key={title} className="flex flex-col rounded-xl border border-line bg-card p-6">
              <span className="flex size-12 items-center justify-center rounded-xl bg-mint text-green">
                <Icon className="size-6" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-heading">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-body">{desc}</p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-green">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

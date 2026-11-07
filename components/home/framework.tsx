import {
  Users,
  ShieldCheck,
  Layers,
  Lock,
  Coins,
  Handshake,
  Sprout,
  BarChart3,
  Target,
} from "lucide-react"

type Pillar = {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  highlight?: boolean
}

const PILLARS: Pillar[] = [
  {
    id: "representation",
    icon: <Users className="h-8 w-8" strokeWidth={1.75} />,
    title: "Industry Representation",
    description:
      "A unified platform for exchanges, investors, blockchain companies, and ecosystem partners.",
  },
  {
    id: "protection",
    icon: <ShieldCheck className="h-8 w-8" strokeWidth={1.75} />,
    title: "Investor Protection",
    description:
      "Promoting best practices, security awareness, and responsible market participation.",
    highlight: true,
  },
  {
    id: "policy",
    icon: <Layers className="h-8 w-8" strokeWidth={1.75} />,
    title: "Policy & Ecosystem Development",
    description:
      "Driving industry dialogue, capacity building, and constructive engagement on a sustainable regulatory framework.",
  },
]

const FOCUS_AREAS = [
  { icon: <Lock className="h-5 w-5" strokeWidth={1.75} />, label: "Security & Risk Awareness" },
  { icon: <Coins className="h-5 w-5" strokeWidth={1.75} />, label: "Industry Standards" },
  { icon: <Handshake className="h-5 w-5" strokeWidth={1.75} />, label: "Collaboration & Partnership" },
  { icon: <Sprout className="h-5 w-5" strokeWidth={1.75} />, label: "Innovation & Growth" },
  { icon: <BarChart3 className="h-5 w-5" strokeWidth={1.75} />, label: "Market Development" },
]

export function Framework() {
  return (
    <section className="relative overflow-hidden bg-mint-2 vaap-section-y">
      <img
        src="/images/framework-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 via-white/70 to-white/85"
      />
      <img
  src="/images/framework-flag-left.png"
  alt=""
  aria-hidden="true"
  className="pointer-events-none absolute left-0 top-0 h-48 w-auto max-w-[32%] select-none object-contain object-left-top opacity-80 mix-blend-multiply sm:h-64 lg:h-80"
      />

      <div className="vaap-container relative">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-balance font-serif fluid-h2 font-bold text-heading">
            A Collaborative Industry Platform for Pakistan&apos;s{" "}
            <span className="text-green">Digital Asset Ecosystem</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-balance fluid-lead text-body">
            Unifying industry stakeholders to promote responsible growth, investor protection,
            innovation, and a secure and inclusive digital asset ecosystem in Pakistan.
          </p>
          <span aria-hidden="true" className="mx-auto mt-6 block h-1.5 w-24 rounded-full bg-green" />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 lg:mt-12">
          {PILLARS.map((pillar) => (
            <article
              key={pillar.id}
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm lg:p-7 ${
                pillar.highlight ? "border-green-border bg-mint" : "border-line bg-card"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-green/10 text-green">
                  {pillar.icon}
                </span>
                <h3 className="text-balance font-serif text-xl font-bold leading-snug text-heading lg:text-2xl">
                  {pillar.title}
                </h3>
              </div>
              <p className="mt-4 text-pretty text-sm leading-relaxed text-body lg:text-[15px]">
                {pillar.description}
              </p>
              <span
                aria-hidden="true"
                className="absolute -bottom-8 -right-8 h-16 w-16 rotate-45 bg-green"
              />
            </article>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-card shadow-sm lg:mt-8">
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            <div className="flex items-center gap-3 bg-[#0b3d2c] px-6 py-4 lg:shrink-0">
              <Target className="h-6 w-6 text-white" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="font-serif text-lg font-bold text-white">Our Focus Areas</h3>
            </div>
            <ul className="grid flex-1 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {FOCUS_AREAS.map((area) => (
                <li
                  key={area.label}
                  className="flex min-w-0 items-center gap-3 border-b border-r border-line px-4 py-4 lg:border-b-0 lg:last:border-r-0"
                >
                  <span className="shrink-0 text-green">{area.icon}</span>
                  <span className="min-w-0 text-pretty text-[13px] font-medium leading-tight text-heading">
                    {area.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

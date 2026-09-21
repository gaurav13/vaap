import {
  Landmark,
  Scale,
  Users,
  FileText,
  ShieldCheck,
  UserCheck,
  Handshake,
  Lightbulb,
  BarChart3,
  Globe,
  Leaf,
} from "lucide-react"

type Pillar = {
  /** brand lockup shown at the top of the card */
  logo: React.ReactNode
  /** stable key */
  id: string
  role: string
  features: { icon: React.ReactNode; label: string }[]
  description: string
  highlight?: boolean
}

const iconClass = "h-6 w-6"

const PILLARS: Pillar[] = [
  {
    id: "gov",
    logo: (
      <div className="flex h-full w-full items-center gap-4 text-left">
        <img
          src="/images/gov-pakistan-logo.png"
          alt="Government of Pakistan state emblem"
          className="h-[76px] w-[76px] shrink-0 object-contain"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-green">
            Government of Pakistan
          </p>
          <p className="mt-1 font-serif text-[26px] leading-[1.15] text-heading">
            Government
            <br />
            of Pakistan
          </p>
        </div>
      </div>
    ),
    mark: (
      <img
        src="/images/gov-pakistan-logo.png"
        alt="Government of Pakistan state emblem"
        className="h-12 w-12 object-contain"
      />
    ),
    mobileTitle: "Government of Pakistan",
    subtitle: "National policy & legal framework",
    role: "National Policy & Legal Framework",
    features: [
      { icon: <Landmark className={iconClass} strokeWidth={1.5} />, label: "Policy Direction" },
      { icon: <Scale className={iconClass} strokeWidth={1.5} />, label: "Enabling Legislation" },
      { icon: <Users className={iconClass} strokeWidth={1.5} />, label: "Institutional Coordination" },
    ],
    description:
      "Provides the national policy and legal foundation for Pakistan's virtual asset ecosystem, supporting innovation, financial stability and economic growth.",
  },
  {
    id: "pvara",
    logo: (
      <div className="flex h-full w-full flex-col items-center justify-center text-center">
        <img
          src="/images/pvara-logo.png"
          alt="PVARA — Pakistan Virtual Assets Regulatory Authority logo"
          className="h-14 w-auto object-contain"
        />
        <p className="mt-3 font-serif text-[22px] leading-[1.2] text-heading">
          Pakistan Virtual Assets
          <br />
          Regulatory Authority
        </p>
      </div>
    ),
    mark: (
      <img src="/images/pvara-logo.png" alt="PVARA logo" className="h-9 w-auto object-contain" />
    ),
    mobileTitle: "Pakistan Virtual Assets Regulatory Authority",
    subtitle: "Licensing • Regulation • Supervision",
    role: "Independent Federal Regulator",
    features: [
      { icon: <FileText className={iconClass} strokeWidth={1.5} />, label: "Licensing & Registration" },
      { icon: <ShieldCheck className={iconClass} strokeWidth={1.5} />, label: "Regulation & Supervision" },
      { icon: <UserCheck className={iconClass} strokeWidth={1.5} />, label: "AML/CFT & Consumer Protection" },
    ],
    description:
      "Established under the Virtual Assets Act, 2026 to regulate virtual assets and virtual asset service providers in Pakistan, ensuring a secure, transparent and resilient market.",
    highlight: true,
  },
  {
    id: "vaap",
    logo: (
      <div className="flex h-full w-full flex-col items-center justify-center text-center">
        <img
          src="/images/vaap-logo.png"
          alt="VAAP — Virtual Assets Association of Pakistan"
          className="h-[92px] w-auto object-contain"
        />
      </div>
    ),
    mark: (
      <img
        src="/images/vaap-logo.png"
        alt="VAAP logo"
        className="h-11 w-auto object-contain"
      />
    ),
    mobileTitle: "Virtual Assets Association of Pakistan",
    subtitle: "Industry voice • Coordination • Growth",
    role: "National Industry Representative",
    features: [
      { icon: <Users className={iconClass} strokeWidth={1.5} />, label: "Industry Voice" },
      { icon: <Handshake className={iconClass} strokeWidth={1.5} />, label: "Coordination & Collaboration" },
      { icon: <Lightbulb className={iconClass} strokeWidth={1.5} />, label: "Policy Dialogue & Education" },
    ],
    description:
      "A not-for-profit, member-based association representing Pakistan's virtual asset industry, working with stakeholders to promote responsible growth, innovation and global opportunities.",
  },
]

const BENEFITS = [
  { icon: <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />, label: "A Safer Ecosystem" },
  { icon: <BarChart3 className="h-5 w-5" strokeWidth={1.75} />, label: "Greater Opportunities" },
  { icon: <Users className="h-5 w-5" strokeWidth={1.75} />, label: "Financial Inclusion" },
  { icon: <Globe className="h-5 w-5" strokeWidth={1.75} />, label: "Global Competitiveness" },
]

export function Framework() {
  return (
    <section className="relative overflow-hidden bg-mint-2 vaap-section-y">
      {/* Patriotic background — Islamic pattern, flag & Islamabad skyline */}
      <img
        src="/images/framework-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />
      {/* Soft wash so content stays readable over the artwork */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 via-white/70 to-white/85"
      />
      {/* Pakistan flag watermark — top right */}
      <img
        src="/images/framework-flag.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-64 w-auto max-w-[55%] select-none object-contain object-right-top opacity-90 sm:h-80 lg:h-96"
      />

      {/* Vertical label — top left */}
      <div className="pointer-events-none absolute left-6 top-24 hidden lg:block">
        <p className="text-[11px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-muted-2">
          A Stronger
          <br />
          Digital
          <br />
          Pakistan
        </p>
        <span className="mt-3 block h-px w-10 bg-gold" />
      </div>

      <div className="vaap-container relative">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-6 shrink-0 bg-gold sm:w-8" />
            <p className="text-pretty text-[11px] font-semibold uppercase tracking-[0.18em] text-navy sm:text-xs sm:tracking-[0.22em]">
              Pakistan&apos;s Virtual Asset Governance Framework
            </p>
            <span className="h-px w-6 shrink-0 bg-gold sm:w-8" />
          </div>
          <h2 className="mt-5 text-balance font-serif fluid-h2 font-bold text-heading">
            Distinct Roles. <span className="text-green">One National Ecosystem.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance fluid-lead text-body sm:max-w-2xl">
            A collaborative framework connecting government, regulatory oversight and industry
            representation to enable a safe, innovative and inclusive digital asset ecosystem in
            Pakistan.
          </p>
        </div>

        {/* Pillars — full cards, stacked on mobile / row on desktop */}
        <div className="relative mt-8 grid grid-cols-1 items-stretch gap-7 lg:mt-12 lg:grid-cols-3 lg:gap-5">
          {PILLARS.map((pillar, i) => (
            <div key={pillar.id} className="relative flex">
              {/* Connector between cards — vertical line on mobile, single dot on desktop */}
              {i < PILLARS.length - 1 && (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-7 left-1/2 z-10 flex h-7 w-2.5 -translate-x-1/2 flex-col items-center lg:hidden"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-green" />
                    <span className="w-px flex-1 bg-green/55" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green" />
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute -right-[10px] top-1/2 z-10 hidden h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-green lg:block"
                  />
                </>
              )}
              <div
                className={`flex w-full flex-col rounded-2xl border p-6 lg:p-7 ${
                  pillar.highlight ? "border-green-border bg-mint shadow-sm" : "border-line bg-card"
                }`}
              >
                <div className="flex min-h-[128px] w-full">{pillar.logo}</div>

                <div className="mt-5 rounded-md bg-green/10 px-4 py-2.5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-green">
                    {pillar.role}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-3 divide-x divide-line">
                  {pillar.features.map((f) => (
                    <div key={f.label} className="flex flex-col items-center gap-2 px-2 text-center">
                      <span className="text-green">{f.icon}</span>
                      <span className="text-xs font-medium leading-tight text-body">{f.label}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-sm leading-relaxed text-body">{pillar.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Together bar — single unified card */}
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-line bg-card shadow-sm lg:mt-8">
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            {/* Dark-green lockup */}
            <div className="flex items-center gap-4 bg-[#00343a] px-6 py-5 lg:w-80 lg:shrink-0">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                <Leaf className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <div className="border-l-2 border-gold pl-4 leading-tight">
                <p className="font-serif text-lg font-bold uppercase tracking-[0.08em] text-white">Together</p>
                <p className="font-serif text-xs font-medium uppercase tracking-[0.14em] text-white/80">
                  For a Stronger Pakistan
                </p>
              </div>
            </div>

            {/* Benefits with landmarks watermark */}
            <div className="relative flex-1">
              <img
                src="/images/pakistan-skyline-watermark.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-[45%] select-none object-contain object-right opacity-60 sm:block"
              />
              <div className="relative grid grid-cols-2 px-4 py-1 sm:grid-cols-4 sm:px-2 sm:py-5">
                {BENEFITS.map((b, i) => (
                  <div
                    key={b.label}
                    className={`flex min-w-0 items-center gap-2.5 py-4 sm:gap-3 sm:px-4 sm:py-0 ${
                      i % 2 === 0 ? "border-r border-line pr-3 sm:pr-0" : "pl-3 sm:pl-0"
                    } ${i < 2 ? "border-b border-line sm:border-b-0" : ""} ${
                      i > 0 ? "sm:border-l sm:border-line" : ""
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-green sm:h-11 sm:w-11">
                      {b.icon}
                    </span>
                    <span className="min-w-0 text-pretty break-words text-[13px] font-medium leading-tight text-heading sm:text-sm">
                      {b.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer line */}
        <div className="mt-6 flex items-center justify-center gap-4 lg:mt-8">
          <span className="h-px w-10 bg-line" />
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-2">
            People · Policy · Progress
          </p>
          <span className="h-px w-10 bg-line" />
        </div>
      </div>
    </section>
  )
}

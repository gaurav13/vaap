import { Building2, Settings, Users } from "lucide-react"

const LOWER = [
  { icon: Building2, title: "Sub-Committees", sub: "Industry Expertise" },
  { icon: Settings, title: "Secretariat", sub: "Operations & Administration" },
  { icon: Users, title: "Advisory Participation", sub: "Experts & Stakeholders" },
]

export function GovernanceStructure() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green">VAAP Governance</p>
      <h2 className="mt-3 text-pretty text-3xl font-bold tracking-tight text-heading sm:text-4xl">
        How VAAP Is Governed
      </h2>
      <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-body">
        VAAP uses a member-driven governance structure designed for accountability, transparency and effective
        industry representation.
      </p>

      <div className="mt-8 flex flex-col items-center">
        <div className="flex w-full max-w-md flex-col items-center gap-1.5 rounded-xl bg-navy px-6 py-4 text-center text-white">
          <span className="flex items-center gap-2 font-bold">
            <Users className="size-5 text-green" /> General Membership
          </span>
          <span className="text-xs text-white/70">All Members</span>
        </div>

        <span aria-hidden className="h-6 w-px bg-line" />

        <div className="flex w-full max-w-md flex-col items-center gap-1.5 rounded-xl bg-green px-6 py-4 text-center text-white">
          <span className="flex items-center gap-2 font-bold">
            <Users className="size-5" /> Executive Committee
          </span>
          <span className="text-xs text-white/80">Leadership & Oversight</span>
        </div>

        <span aria-hidden className="h-6 w-px bg-line" />

        <div className="grid w-full gap-4 sm:grid-cols-3">
          {LOWER.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex flex-col items-center rounded-xl border border-line bg-card px-4 py-5 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-mint text-green">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-3 text-sm font-bold text-heading">{title}</h3>
              <p className="mt-0.5 text-xs text-body">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

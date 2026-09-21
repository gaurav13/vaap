import { Scale, ShieldCheck, TrendingUp, Users, FileText } from "lucide-react"

const PRINCIPLES = [
  { icon: FileText, label: "Transparency" },
  { icon: ShieldCheck, label: "Accountability" },
  { icon: Scale, label: "Integrity" },
  { icon: Users, label: "Participation" },
  { icon: TrendingUp, label: "Long-Term Impact" },
]

export function GovernancePrinciples() {
  return (
    <div className="rounded-2xl bg-mint p-6 sm:p-8">
      <h2 className="text-xl font-bold tracking-tight text-heading">Our Governance Principles</h2>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PRINCIPLES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-xl border border-green-border/60 bg-card px-3 py-5 text-center"
          >
            <Icon className="size-6 text-green" />
            <span className="text-xs font-semibold text-heading">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

import { Briefcase, Clock, ShieldCheck, UserCheck } from "lucide-react"

const CRITERIA = [
  {
    icon: Briefcase,
    title: "Industry experience",
    text: "Relevant professional experience in fintech, blockchain, virtual assets, banking, technology, regulatory affairs, or related industries.",
  },
  {
    icon: UserCheck,
    title: "VAAP membership",
    text: "An existing VAAP member, or willing to become a registered member upon acceptance of your leadership or advisory application.",
  },
  {
    icon: Clock,
    title: "Voluntary commitment",
    text: "Able to contribute a minimum of 5 hours per month to VAAP meetings, advisory discussions, and industry initiatives.",
  },
  {
    icon: ShieldCheck,
    title: "Internal collaboration",
    text: "Participate in internal discussions, share professional expertise, and keep non-public VAAP information confidential.",
  },
]

export function LeadershipEligibility() {
  return (
    <section aria-labelledby="eligibility-title" className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex flex-col gap-1.5 border-b border-line px-6 py-5 md:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-green">Before you apply</p>
        <h2 id="eligibility-title" className="font-serif text-xl font-semibold text-heading">
          Eligibility &amp; commitment
        </h2>
        <p className="text-sm leading-relaxed text-muted-2">
          To be considered for a VAAP leadership or advisory position, applicants must meet the following criteria.
        </p>
      </div>
      <ul className="grid gap-px bg-line sm:grid-cols-2">
        {CRITERIA.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-4 bg-card px-6 py-5 md:px-8 md:py-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-green-border bg-mint-2 text-green">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-heading">{title}</h3>
              <p className="text-sm leading-relaxed text-body">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

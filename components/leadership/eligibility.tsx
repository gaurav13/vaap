import { Briefcase, Clock, ShieldCheck, UserCheck } from "lucide-react"

const CRITERIA = [
  {
    icon: Briefcase,
    title: "Industry Experience",
    text: "Have relevant professional experience in fintech, blockchain, virtual assets, banking, technology, regulatory affairs, or related industries.",
  },
  {
    icon: UserCheck,
    title: "VAAP Membership",
    text: "Be an existing VAAP member or agree to become a registered member upon acceptance of your leadership or advisory application.",
  },
  {
    icon: Clock,
    title: "Voluntary Commitment",
    text: "Be willing to contribute a minimum of 5 hours per month to VAAP meetings, advisory discussions, and industry initiatives on a voluntary basis.",
  },
  {
    icon: ShieldCheck,
    title: "Internal Collaboration",
    text: "Participate in relevant internal discussions, share professional expertise, and maintain the confidentiality of non-public VAAP information.",
  },
]

export function LeadershipEligibility() {
  return (
    <section aria-labelledby="eligibility-title" className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 shadow-sm md:p-7">
      <div className="flex flex-col gap-1">
        <h2 id="eligibility-title" className="font-serif text-lg font-semibold text-heading">
          Leadership Eligibility &amp; Commitment
        </h2>
        <p className="text-sm leading-relaxed text-muted-2">
          To be considered for a VAAP leadership or advisory position, applicants must:
        </p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        {CRITERIA.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 rounded-xl bg-mint-2 p-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-green">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-body">
              <span className="font-semibold text-heading">{title}: </span>
              {text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

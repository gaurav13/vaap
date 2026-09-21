import { FileText, Search, Send, CheckCircle2, ShieldAlert } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { TrackCase } from "./track-case"

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: FileText, title: "Submitted", body: "You submit your concern." },
  { icon: Search, title: "Review", body: "Our team reviews your case." },
  { icon: Send, title: "Guidance / Referral", body: "We provide guidance or refer to the relevant authority if needed." },
  { icon: CheckCircle2, title: "Closed", body: "You will be notified once the case is closed." },
]

export function CaseHandling() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-serif text-2xl text-heading lg:text-3xl">How Your Case Is Handled</h2>

        <ol className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-mint text-green">
                <Icon className="size-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-heading">
                {i + 1}. {title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-body">{body}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-gold-border bg-gold-tint p-5">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold" />
          <div>
            <p className="text-sm font-semibold text-heading">Important Notice</p>
            <p className="mt-1.5 text-sm leading-relaxed text-body">
              VAAP is an industry association. We provide support, guidance and complaint facilitation for our members
              and virtual asset users.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-body">
              <span className="font-semibold text-heading">
                We do not have regulatory, investigative or enforcement powers.
              </span>{" "}
              Matters involving unlicensed providers, fraud, or regulatory violations may be referred to PVARA or other
              competent authorities.
            </p>
          </div>
        </div>
      </div>

      <TrackCase />
    </div>
  )
}

import Link from "next/link"
import { ArrowRight, Lock } from "lucide-react"

const STEPS = [
  { title: "Submit your application", body: "Share your expertise and how you would contribute." },
  { title: "Committee review", body: "The VAAP team reviews every application and may reach out." },
  { title: "Membership verification", body: "Accepted applicants confirm or complete VAAP membership." },
  { title: "Profile published", body: "Our editors finalise your profile for the leadership page." },
]

export function ApplySidebar() {
  return (
    <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
      <section aria-labelledby="process-heading" className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="border-b border-line px-6 py-4">
          <h2 id="process-heading" className="text-xs font-bold uppercase tracking-[0.2em] text-green">
            Selection process
          </h2>
        </div>
        <ol className="flex flex-col px-6 py-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 pb-5 last:pb-0">
              {i < STEPS.length - 1 && (
                <span className="absolute left-3.5 top-8 h-[calc(100%-2rem)] w-px bg-line" aria-hidden="true" />
              )}
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-green-border bg-card text-xs font-bold text-green">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-heading">{step.title}</p>
                <p className="text-sm leading-relaxed text-muted-2">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex gap-3 border-t border-line bg-surface px-6 py-4">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-2" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-muted-2">
            Private contact details are visible only to the VAAP review team and are never published.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-card px-6 py-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-heading">Questions about applying?</p>
          <p className="text-sm leading-relaxed text-muted-2">Our secretariat can help with eligibility and the process.</p>
        </div>
        <Link
          href="/contact"
          className="group inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-green hover:text-green-hover"
        >
          Contact the VAAP team
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </section>
    </aside>
  )
}

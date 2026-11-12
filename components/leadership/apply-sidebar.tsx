import Link from "next/link"
import { Mail, ShieldCheck } from "lucide-react"

const STEPS = [
  { title: "Submit your application", body: "Tell us about your expertise and how you would contribute." },
  { title: "Committee review", body: "The VAAP team reviews every application and may reach out." },
  { title: "Profile editing", body: "If approved, our editors polish your public profile with you." },
  { title: "Published", body: "Your profile goes live on the VAAP leadership page." },
]

export function ApplySidebar() {
  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
      <section aria-labelledby="process-heading" className="rounded-2xl border border-line bg-card p-6">
        <h2 id="process-heading" className="font-serif text-lg font-semibold text-heading">
          How it works
        </h2>
        <ol className="mt-5 flex flex-col">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 pb-5 last:pb-0">
              {i < STEPS.length - 1 && (
                <span className="absolute left-3.5 top-8 h-[calc(100%-2rem)] w-px bg-line" aria-hidden="true" />
              )}
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mint text-xs font-bold text-green">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-heading">{step.title}</p>
                <p className="text-sm leading-relaxed text-muted-2">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex gap-3 rounded-2xl border border-green-border bg-mint-2 p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-green" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-body">
          Your private contact details are only visible to the VAAP review team and are never published.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-5">
        <p className="text-sm font-semibold text-heading">Questions about applying?</p>
        <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-green hover:text-green-hover">
          <Mail className="size-4" aria-hidden="true" />
          Contact the VAAP team
        </Link>
      </section>
    </aside>
  )
}

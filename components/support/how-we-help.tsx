import { MessageSquare, ShieldCheck, BookOpen, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const ITEMS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MessageSquare,
    title: "Complaint Assistance",
    body: "Help record and guide your concerns with proper documentation.",
  },
  {
    icon: ShieldCheck,
    title: "Scam & Fraud Guidance",
    body: "Learn how to identify scams and protect yourself.",
  },
  {
    icon: BookOpen,
    title: "AML/CFT Awareness",
    body: "Educational resources on KYC, source of funds and responsible participation.",
  },
  {
    icon: Users,
    title: "Regulatory Referral",
    body: "We guide you to the relevant authorities when required (e.g. PVARA).",
  },
]

export function HowWeHelp() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-green">
          <span className="h-px w-8 bg-green/40" aria-hidden="true" />
          What We Offer
        </span>
        <h2 className="mt-3 font-serif text-3xl text-heading lg:text-4xl">How We Help</h2>
        <p className="mt-2 text-body">Practical support for a safer and more informed virtual asset community.</p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="group relative overflow-hidden rounded-2xl border border-line bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-green/40 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]"
          >
            <span
              className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-green transition-transform duration-300 group-hover:scale-x-100"
              aria-hidden="true"
            />
            <span className="flex size-14 items-center justify-center rounded-xl bg-mint text-green transition-colors duration-300 group-hover:bg-green group-hover:text-white">
              <Icon className="size-7" strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 font-serif text-lg text-heading">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">{body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

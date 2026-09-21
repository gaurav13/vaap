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
      <h2 className="font-serif text-3xl text-heading lg:text-4xl">How We Help</h2>
      <p className="mt-2 text-body">Practical support for a safer and more informed virtual asset community.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <article key={title} className="rounded-xl border border-line bg-card p-6">
            <span className="flex size-12 items-center justify-center rounded-lg bg-mint text-green">
              <Icon className="size-6" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-heading">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">{body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

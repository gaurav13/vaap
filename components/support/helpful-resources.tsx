import Link from "next/link"
import { BookOpen, ShieldCheck, Wallet, ArrowRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

const RESOURCES: { icon: LucideIcon; title: string; body: string; href: string }[] = [
  {
    icon: BookOpen,
    title: "AML/CFT Basics",
    body: "Understand KYC, source of funds and your responsibilities.",
    href: "/resources",
  },
  {
    icon: ShieldCheck,
    title: "Stay Safe from Scams",
    body: "Learn to identify fraud and phishing attempts.",
    href: "/resources",
  },
  {
    icon: Wallet,
    title: "Wallet Security",
    body: "Best practices for securing your digital assets.",
    href: "/resources",
  },
]

export function HelpfulResources() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl text-heading lg:text-4xl">Helpful Resources</h2>
            <p className="mt-2 text-body">Stay informed. Stay safe.</p>
          </div>
          <Link
            href="/resources"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green transition-colors hover:text-green-hover"
          >
            View All Resources
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {RESOURCES.map(({ icon: Icon, title, body, href }) => (
            <article key={title} className="rounded-xl border border-line bg-card p-6">
              <span className="flex size-12 items-center justify-center rounded-lg bg-mint text-green">
                <Icon className="size-6" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-heading">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{body}</p>
              <Link
                href={href}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green transition-colors hover:text-green-hover"
              >
                Read Guide
                <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

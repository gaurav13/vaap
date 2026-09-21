"use client"

import { useState } from "react"
import { HelpCircle, ChevronDown, ArrowRight } from "lucide-react"
import Link from "next/link"

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is VAAP a regulator?",
    a: "No. VAAP is an industry association. We provide support, guidance and complaint facilitation, but we do not have regulatory, investigative or enforcement powers. Where needed, matters are referred to PVARA or other competent authorities.",
  },
  {
    q: "What information should I never share?",
    a: "Never share private keys, seed phrases, passwords or wallet recovery credentials — with VAAP or anyone else. No legitimate organisation will ever ask for them.",
  },
  {
    q: "Can non-members submit a complaint?",
    a: "Yes. Any virtual asset user can submit a concern through this centre. Membership is not required to receive guidance or a referral.",
  },
  {
    q: "How long does it take to resolve a case?",
    a: "Timelines vary by complexity. Our team reviews every submission and keeps you updated. You can check the latest status any time using your case reference above.",
  },
]

export function SupportFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-3 font-serif text-3xl text-heading lg:text-4xl">
          <HelpCircle className="size-7 text-green" />
          Frequently Asked Questions
        </h2>
        <Link
          href="/resources"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-green transition-colors hover:text-green-hover"
        >
          View All FAQs
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {FAQS.map((faq, i) => {
          const isOpen = open === i
          return (
            <div key={faq.q} className="rounded-xl border border-line bg-card">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-heading">{faq.q}</span>
                <ChevronDown
                  className={`size-5 shrink-0 text-green transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen ? <p className="px-5 pb-5 text-sm leading-relaxed text-body">{faq.a}</p> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

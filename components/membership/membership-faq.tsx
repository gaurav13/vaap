"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Plus, Minus } from "lucide-react"

export type MembershipFaq = {
  id: number
  question: string
  answer: string
}

export type MembershipFaqHeader = {
  faqEyebrow: string
  faqHeading: string
  faqDescription: string
  faqCtaLabel: string
  faqCtaHref: string
}

export function MembershipFaq({
  faqs,
  header,
}: {
  faqs: MembershipFaq[]
  header: MembershipFaqHeader
}) {
  if (faqs.length === 0) return null

  // Balance items across two columns: fill left column first, then right.
  const mid = Math.ceil(faqs.length / 2)
  const columns = [faqs.slice(0, mid), faqs.slice(mid)]

  return (
    <section id="faq" className="scroll-mt-24 bg-background">
      <div className="mx-auto max-w-7xl px-5 py-[clamp(3rem,6vw,5rem)] lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
                {header.faqEyebrow}
              </p>
              <span className="h-px w-10 bg-gold/50" aria-hidden />
            </div>
            <h2 className="mt-4 font-serif text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-tight text-navy text-balance">
              {header.faqHeading}
            </h2>
            {header.faqDescription ? (
              <p className="mt-3 text-body">{header.faqDescription}</p>
            ) : null}
          </div>

          {header.faqCtaLabel && header.faqCtaHref ? (
            <Link
              href={header.faqCtaHref}
              className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-gold transition-colors hover:text-gold-hover"
            >
              {header.faqCtaLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          ) : null}
        </div>

        <div className="mt-10 grid gap-x-8 md:grid-cols-2">
          {columns.map((col, colIndex) => (
            <ul key={colIndex} className="flex flex-col">
              {col.map((faq) => (
                <FaqItem key={faq.id} faq={faq} />
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqItem({ faq }: { faq: MembershipFaq }) {
  const [open, setOpen] = useState(false)
  const panelId = `faq-panel-${faq.id}`
  const buttonId = `faq-button-${faq.id}`

  return (
    <li className="border-b border-line">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-green"
        >
          <span className="font-semibold text-navy">{faq.question}</span>
          <span
            className="flex size-6 shrink-0 items-center justify-center text-gold"
            aria-hidden
          >
            {open ? <Minus className="size-5" /> : <Plus className="size-5" />}
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="pb-5 pr-10 text-body leading-relaxed"
      >
        {faq.answer}
      </div>
    </li>
  )
}

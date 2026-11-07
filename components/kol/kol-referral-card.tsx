"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, Copy, ShieldCheck } from "lucide-react"

export function KolReferralCard({ code, url, firstName }: { code: string; url: string; firstName: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null)

  async function copy(value: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied(null)
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-navy-dark p-6" aria-labelledby="referral-heading">
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-green-light">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Official referral code
        </span>
        <h2 id="referral-heading" className="font-serif text-xl font-bold text-card text-balance">
          Join VAAP with {firstName}
        </h2>
        <p className="text-sm leading-relaxed text-card/75 text-pretty">
          Use this verified code when applying for membership so your application is credited to {firstName}.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-card/25 bg-card/5 px-4 py-3">
        <span className="font-mono text-lg font-bold tracking-wider text-card">{code}</span>
        <button
          type="button"
          onClick={() => copy(code, "code")}
          aria-label={copied === "code" ? "Code copied" : "Copy referral code"}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card/10 text-card transition-colors hover:bg-card/20"
        >
          {copied === "code" ? <Check className="size-4 text-green-light" /> : <Copy className="size-4" />}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied === "code" ? "Referral code copied" : copied === "link" ? "Referral link copied" : ""}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
        <Link
          href={url}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-card transition-colors hover:bg-green/90"
        >
          Apply with this code
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => copy(new URL(url, window.location.origin).toString(), "link")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-card/25 px-4 py-2.5 text-sm font-semibold text-card transition-colors hover:bg-card/10"
        >
          {copied === "link" ? <Check className="size-4 text-green-light" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied === "link" ? "Link copied" : "Copy invite link"}
        </button>
      </div>
    </section>
  )
}

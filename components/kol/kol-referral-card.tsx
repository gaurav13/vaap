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
    <section
      className="relative flex flex-col gap-5 rounded-3xl border border-gold/40 bg-card/5 p-6 shadow-2xl backdrop-blur-sm md:p-7"
      aria-labelledby="referral-heading"
    >
      <span className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gold" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-green-light">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Official referral code
        </p>
        <h2 id="referral-heading" className="text-xl font-bold text-card text-balance md:text-2xl">
          Join VAAP with {firstName}
        </h2>
        <p className="text-sm leading-relaxed text-card/70 text-pretty">
          Use this verified code when applying for membership to get a recognized referral from a VAAP Verified KOL.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-card/15 bg-navy-dark/60 py-2 pl-5 pr-2">
        <span className="truncate font-mono text-lg font-bold tracking-wider text-card">{code}</span>
        <button
          type="button"
          onClick={() => copy(code, "code")}
          aria-label={copied === "code" ? "Code copied" : "Copy referral code"}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card/10 text-card transition-colors hover:bg-card/20"
        >
          {copied === "code" ? <Check className="size-5" /> : <Copy className="size-5" />}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied === "code" ? "Referral code copied" : copied === "link" ? "Referral link copied" : ""}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row [&>*]:whitespace-nowrap">
        <Link
          href={url}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-light px-4 py-3 text-sm font-bold text-navy-dark shadow-lg transition-colors hover:bg-card"
        >
          Apply with this code
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => copy(new URL(url, window.location.origin).toString(), "link")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-card/30 px-4 py-3 text-sm font-semibold text-card transition-colors hover:bg-card/10"
        >
          {copied === "link" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied === "link" ? "Link copied" : "Copy invite link"}
        </button>
      </div>
    </section>
  )
}

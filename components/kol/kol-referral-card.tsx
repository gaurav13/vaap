"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, Copy, Link2, ShieldCheck } from "lucide-react"

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
    <section className="@container relative rounded-2xl border border-card/15 bg-card/[0.04] shadow-2xl" aria-labelledby="referral-heading">
      <span className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-gold to-transparent" aria-hidden="true" />
      <div className="grid gap-5 p-5 sm:p-6 @2xl:grid-cols-2 @2xl:items-center @2xl:gap-8">
        <div className="flex flex-col gap-2">
          <p className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Official referral code
          </p>
          <h2 id="referral-heading" className="text-lg font-semibold text-card text-balance sm:text-xl">
            Join VAAP with {firstName}
          </h2>
          <p className="text-sm leading-relaxed text-card/65 text-pretty">
            Apply with this code to receive a recognized referral from a VAAP Verified KOL.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-gold/40 bg-navy-dark/70 py-1.5 pl-4 pr-1.5">
            <div className="flex min-w-0 flex-col">
              <span className="text-[0.65rem] font-medium uppercase tracking-widest text-card/50">Your code</span>
              <span className="truncate font-mono text-base font-bold tracking-wider text-card sm:text-lg">{code}</span>
            </div>
            <button
              type="button"
              onClick={() => copy(code, "code")}
              aria-label={copied === "code" ? "Code copied" : "Copy referral code"}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card/10 text-card transition-colors hover:bg-card/20 focus-visible:outline-2 focus-visible:outline-gold"
            >
              {copied === "code" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            </button>
          </div>
          <p className="sr-only" aria-live="polite">
            {copied === "code" ? "Referral code copied" : copied === "link" ? "Referral link copied" : ""}
          </p>

          <div className="grid grid-cols-1 gap-2.5 @xs:grid-cols-2">
            <Link
              href={url}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-green-light px-4 py-2.5 text-sm font-semibold text-navy-dark transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-gold"
            >
              Apply with code
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => copy(new URL(url, window.location.origin).toString(), "link")}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-card/25 px-4 py-2.5 text-sm font-semibold text-card transition-colors hover:bg-card/10 focus-visible:outline-2 focus-visible:outline-gold"
            >
              {copied === "link" ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
              {copied === "link" ? "Link copied" : "Copy invite link"}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

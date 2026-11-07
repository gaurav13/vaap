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
    <section className="@container relative rounded-2xl border border-line-light bg-card/90 shadow-xl backdrop-blur-md" aria-labelledby="referral-heading">
      <span className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-gold to-transparent" aria-hidden="true" />
      <div className="grid gap-5 p-5 sm:p-6 @2xl:grid-cols-2 @2xl:items-center @2xl:gap-8">
        <div className="flex flex-col gap-2">
          <p className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-green">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Official referral code
          </p>
          <h2 id="referral-heading" className="font-serif text-lg font-bold text-heading text-balance sm:text-xl">
            Join VAAP with {firstName}
          </h2>
          <p className="text-sm leading-relaxed text-body text-pretty">
            Apply with this code to receive a recognized referral from a VAAP Verified KOL.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-green/35 bg-mint py-1.5 pl-4 pr-1.5">
            <div className="flex min-w-0 flex-col">
              <span className="text-[0.65rem] font-medium uppercase tracking-widest text-body">Referral code</span>
              <span className="truncate font-mono text-base font-bold tracking-wider text-heading sm:text-lg">{code}</span>
            </div>
            <button
              type="button"
              onClick={() => copy(code, "code")}
              aria-label={copied === "code" ? "Code copied" : "Copy referral code"}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-green shadow-sm ring-1 ring-line-light transition-colors hover:bg-green hover:text-card focus-visible:outline-2 focus-visible:outline-green"
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
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-green px-4 py-2.5 text-sm font-semibold text-card shadow-sm transition-colors hover:bg-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
            >
              Apply with code
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => copy(new URL(url, window.location.origin).toString(), "link")}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-heading transition-colors hover:border-green hover:text-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
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

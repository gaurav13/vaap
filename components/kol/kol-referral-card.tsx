"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, Copy, Link2 } from "lucide-react"

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
    <section className="@container relative rounded-3xl border border-line-light bg-card shadow-2xl shadow-heading/10" aria-labelledby="referral-heading">
      <div className="grid gap-5 p-5 sm:p-7 @2xl:grid-cols-2 @2xl:items-center @2xl:gap-8">
        <div className="flex flex-col gap-2">
          <p className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-green">
            <Link2 className="size-4" strokeWidth={2.5} aria-hidden="true" />
            Official referral code
          </p>
          <h2 id="referral-heading" className="text-lg font-bold tracking-tight text-heading text-balance sm:text-xl">
            Join VAAP with {firstName}
          </h2>
          <p className="text-sm leading-relaxed text-body text-pretty">
            Use this verified code to get a recognized referral from a VAAP Verified KOL.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-mint py-1.5 pl-4 pr-1.5 ring-1 ring-green/10">
            <span className="truncate font-mono text-base font-bold tracking-wider text-heading sm:text-lg">{code}</span>
            <button
              type="button"
              onClick={() => copy(code, "code")}
              aria-label={copied === "code" ? "Code copied" : "Copy referral code"}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-green shadow-sm ring-1 ring-line-light transition-colors hover:bg-green hover:text-card focus-visible:outline-2 focus-visible:outline-green"
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
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-b from-green to-green/85 px-4 py-3 text-sm font-semibold text-card shadow-lg shadow-green/25 transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
            >
              Apply with this code
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => copy(new URL(url, window.location.origin).toString(), "link")}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-green/30 bg-card px-4 py-3 text-sm font-semibold text-heading transition-colors hover:border-green hover:text-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
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

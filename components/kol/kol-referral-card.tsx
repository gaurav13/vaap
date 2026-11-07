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
    <section className="flex flex-col gap-4" aria-labelledby="referral-heading">
      <div className="flex flex-col gap-1.5">
        <h2
          id="referral-heading"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green"
        >
          <Link2 className="size-5" aria-hidden="true" />
          Official referral code
        </h2>
        <p className="text-sm leading-relaxed text-body text-pretty">
          Join VAAP with {firstName} and get a verified referral.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-green-border bg-mint px-4 py-3">
        <span className="font-mono text-lg font-bold tracking-wider text-heading">{code}</span>
        <button
          type="button"
          onClick={() => copy(code, "code")}
          aria-label={copied === "code" ? "Code copied" : "Copy referral code"}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-green transition-colors hover:bg-card"
        >
          {copied === "code" ? <Check className="size-5" /> : <Copy className="size-5" />}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied === "code" ? "Referral code copied" : copied === "link" ? "Referral link copied" : ""}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row [&>*]:whitespace-nowrap">
        <Link
          href={url}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-card shadow-sm transition-colors hover:bg-green-hover"
        >
          Apply with this code
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => copy(new URL(url, window.location.origin).toString(), "link")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-green px-5 py-2.5 text-sm font-semibold text-green transition-colors hover:bg-mint"
        >
          {copied === "link" ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
          {copied === "link" ? "Link copied" : "Copy invite link"}
        </button>
      </div>
    </section>
  )
}

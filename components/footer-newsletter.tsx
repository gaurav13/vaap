'use client'

import { useState } from 'react'
import { ArrowRight, Check, Lock } from 'lucide-react'

export function FooterNewsletter({
  cta,
  privacyNote,
}: {
  cta: string
  privacyNote: string
}) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.trim()) return
    setDone(true)
  }

  return (
    <div>
      {done ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-green-border/40 bg-green/10 px-4 py-3.5 text-sm text-white">
          <Check className="size-4 shrink-0 text-green" />
          <span>Thanks for subscribing. We&apos;ll be in touch.</span>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch"
        >
          <label htmlFor="footer-newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="footer-newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-green-border focus:ring-2 focus:ring-green/25"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green/90"
          >
            {cta} <ArrowRight className="size-4" />
          </button>
        </form>
      )}
      {privacyNote && (
        <p className="mt-3 flex items-center gap-2 text-xs text-white/50">
          <Lock className="size-3.5 text-green" />
          {privacyNote}
        </p>
      )}
    </div>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { saveSeoGlobals } from "@/app/actions/seo"
import type { SeoGlobals } from "@/lib/seo/shared"

type TextKey = Exclude<keyof SeoGlobals, "allowSearchCrawlers" | "allowAiTraining">

const FIELDS: { key: TextKey; label: string; help?: string; long?: boolean }[] = [
  { key: "siteName", label: "Site name" },
  { key: "legalName", label: "Organization legal name" },
  { key: "siteUrl", label: "Production site URL", help: "Used for canonical URLs, sitemaps and share links." },
  { key: "titleSuffix", label: "Title suffix", help: 'Appended to page titles, e.g. " | VAAP".' },
  { key: "defaultDescription", label: "Default meta description", long: true },
  { key: "defaultOgImage", label: "Fallback share image", help: "1200 × 630. Used when a page has no image." },
  { key: "logo", label: "Logo URL" },
  { key: "locale", label: "Locale", help: "e.g. en_PK" },
  { key: "twitterHandle", label: "X handle", help: "e.g. @vaap_pk" },
  { key: "contactEmail", label: "Contact email" },
  { key: "contactPhone", label: "Contact phone" },
  { key: "address", label: "Address / locality" },
  { key: "googleVerification", label: "Google Search Console verification code" },
  { key: "bingVerification", label: "Bing Webmaster verification code" },
]

export function SeoGlobalsForm({ initial }: { initial: SeoGlobals }) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const res = await saveSeoGlobals(form)
      setMessage(res.ok ? { ok: true, text: "Global SEO settings saved." } : { ok: false, text: res.error })
      if (res.ok) router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="mt-6 flex max-w-3xl flex-col gap-6">
      <section className="grid gap-4 rounded-xl border border-line bg-card p-5 md:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className={`flex flex-col gap-1.5 ${f.long ? "md:col-span-2" : ""}`}>
            <span className="text-sm font-medium text-heading">{f.label}</span>
            {f.long ? (
              <Textarea rows={3} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            ) : (
              <Input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            )}
            {f.help && <span className="text-xs text-muted-2">{f.help}</span>}
          </label>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-card p-5">
        <h2 className="text-base font-bold text-heading">Crawlers</h2>
        <label className="flex items-start gap-3 text-sm text-body">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-green"
            checked={form.allowSearchCrawlers}
            onChange={(e) => setForm({ ...form, allowSearchCrawlers: e.target.checked })}
          />
          <span>
            <span className="font-medium text-heading">Allow search engines to index the site</span>
            <span className="block text-muted-2">Turning this off blocks all crawlers in robots.txt.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-body">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-green"
            checked={form.allowAiTraining}
            onChange={(e) => setForm({ ...form, allowAiTraining: e.target.checked })}
          />
          <span>
            <span className="font-medium text-heading">Allow AI training crawlers</span>
            <span className="block text-muted-2">GPTBot, Google-Extended, CCBot and similar.</span>
          </span>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-green px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save settings
        </button>
        {message && (
          <p role="status" className={`text-sm ${message.ok ? "text-green" : "text-destructive"}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SeoImageField } from "@/components/admin/seo/seo-image-field"
import { saveSeoGlobals } from "@/app/actions/seo"
import { saveSocialLinks } from "@/app/actions/settings"
import type { SeoGlobals } from "@/lib/seo/shared"
import { SOCIAL_PLATFORMS, type SocialLinks } from "@/lib/social-platforms"

type TextKey = Exclude<keyof SeoGlobals, "allowSearchCrawlers" | "allowAiTraining">

const IMAGE_FIELDS: { key: "defaultOgImage" | "logo"; label: string; help: string; previewClassName: string }[] = [
  {
    key: "defaultOgImage",
    label: "Fallback share image",
    help: "1200 × 630. Used when a page has no image.",
    previewClassName: "aspect-[1200/630] w-64 object-cover",
  },
  { key: "logo", label: "Logo", help: "Square PNG or SVG, at least 112 × 112. Used in structured data.", previewClassName: "size-20 p-2" },
]

const FIELDS: { key: TextKey; label: string; help?: string; long?: boolean }[] = [
  { key: "siteName", label: "Site name" },
  { key: "legalName", label: "Organization legal name" },
  { key: "siteUrl", label: "Production site URL", help: "Used for canonical URLs, sitemaps and share links." },
  { key: "titleSuffix", label: "Title suffix", help: 'Appended to page titles, e.g. " | VAAP".' },
  { key: "defaultDescription", label: "Default meta description", long: true },
  { key: "locale", label: "Locale", help: "e.g. en_PK" },
  { key: "twitterHandle", label: "X handle", help: "e.g. @vaap_pk" },
  { key: "contactEmail", label: "Contact email" },
  { key: "contactPhone", label: "Contact phone" },
  { key: "address", label: "Address / locality" },
  { key: "googleVerification", label: "Google Search Console verification code" },
  { key: "bingVerification", label: "Bing Webmaster verification code" },
]

export function SeoGlobalsForm({ initial, initialSocial }: { initial: SeoGlobals; initialSocial: SocialLinks }) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [social, setSocial] = useState(initialSocial)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [uploads, setUploads] = useState(0)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const socialRes = await saveSocialLinks(social)
      if (!socialRes.ok) {
        setMessage({ ok: false, text: socialRes.error })
        return
      }
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

      <section className="grid gap-5 rounded-xl border border-line bg-card p-5 md:grid-cols-2">
        <h2 className="text-base font-bold text-heading md:col-span-2">Images</h2>
        {IMAGE_FIELDS.map((f) => (
          <SeoImageField
            key={f.key}
            label={f.label}
            help={f.help}
            previewClassName={f.previewClassName}
            value={form[f.key]}
            onChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
            onBusyChange={(busy) => setUploads((n) => n + (busy ? 1 : -1))}
          />
        ))}
      </section>

      <section className="grid gap-4 rounded-xl border border-line bg-card p-5 md:grid-cols-2">
        <div className="flex flex-col gap-1 md:col-span-2">
          <h2 className="text-base font-bold text-heading">Social accounts</h2>
          <p className="text-sm text-muted-2 text-pretty">
            Official profiles listed as <code className="font-mono text-xs">sameAs</code> in Organization structured data. Shared with the site footer and Settings → Social.
          </p>
        </div>
        {SOCIAL_PLATFORMS.map((p) => (
          <label key={p.key} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-heading">{p.label}</span>
            <Input
              type="url"
              inputMode="url"
              placeholder={p.placeholder}
              value={social[p.key] ?? ""}
              onChange={(e) => setSocial((prev) => ({ ...prev, [p.key]: e.target.value }))}
            />
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
          disabled={pending || uploads > 0}
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

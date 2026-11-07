"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { resetSeoEntry, saveSeoEntry, type SeoEntryInput } from "@/app/actions/seo"
import {
  DESCRIPTION_MAX,
  EMPTY_OVERRIDE,
  TITLE_MAX,
  type AuditIssue,
  type ResolvedSeo,
  type SeoKind,
  type SeoOverride,
} from "@/lib/seo/shared"

type Props = {
  seoKey: string
  kind: SeoKind
  path: string
  siteUrl: string
  siteName: string
  defaults: ResolvedSeo
  override: SeoOverride | null
  issues: AuditIssue[]
  jsonLd: string
}

const EVENT_FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: "endDate", label: "End date & time", placeholder: "2026-11-20T18:00" },
  { key: "timezone", label: "Timezone", placeholder: "Asia/Karachi" },
  { key: "eventStatus", label: "Event status", placeholder: "EventScheduled" },
  { key: "venueName", label: "Venue name" },
  { key: "streetAddress", label: "Street address" },
  { key: "registrationUrl", label: "Registration URL", placeholder: "https://" },
  { key: "price", label: "Ticket price", placeholder: "0" },
  { key: "currency", label: "Currency", placeholder: "PKR" },
  { key: "availability", label: "Availability", placeholder: "InStock" },
]

function toInput(o: SeoOverride | null): SeoEntryInput {
  const base = { ...EMPTY_OVERRIDE, ...(o ?? {}) }
  return {
    seoTitle: base.seoTitle,
    metaDescription: base.metaDescription,
    keywords: base.keywords,
    canonicalUrl: base.canonicalUrl,
    ogTitle: base.ogTitle,
    ogDescription: base.ogDescription,
    ogImage: base.ogImage,
    twitterTitle: base.twitterTitle,
    twitterDescription: base.twitterDescription,
    twitterImage: base.twitterImage,
    customSchema: base.customSchema,
    noindex: base.noindex,
    published: base.published,
    extra: { ...base.extra },
  }
}

export function SeoEditor({ seoKey, kind, path, siteUrl, siteName, defaults, override, issues, jsonLd }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<SeoEntryInput>(() => toInput(override))
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const set = <K extends keyof SeoEntryInput>(k: K, v: SeoEntryInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setExtra = (k: string, v: string) => setForm((f) => ({ ...f, extra: { ...f.extra, [k]: v } }))

  const abs = (u: string) => (!u ? "" : /^https?:\/\//.test(u) ? u : `${siteUrl}${u.startsWith("/") ? "" : "/"}${u}`)
  const preview = {
    title: form.seoTitle || defaults.title,
    description: form.metaDescription || defaults.description,
    url: abs(form.canonicalUrl) || defaults.canonical,
    ogTitle: form.ogTitle || form.seoTitle || defaults.ogTitle,
    ogDescription: form.ogDescription || form.metaDescription || defaults.ogDescription,
    ogImage: abs(form.ogImage) || defaults.ogImage,
  }

  function save() {
    setMessage(null)
    startTransition(async () => {
      const res = await saveSeoEntry(seoKey, form)
      setMessage(res.ok ? { ok: true, text: "Saved. Live metadata has been refreshed." } : { ok: false, text: res.error })
      if (res.ok) router.refresh()
    })
  }

  function reset() {
    if (!confirm("Remove all custom SEO for this page and use the automatic defaults?")) return
    startTransition(async () => {
      const res = await resetSeoEntry(seoKey)
      if (res.ok) {
        setForm(toInput(null))
        setMessage({ ok: true, text: "Reset to automatic defaults." })
        router.refresh()
      } else setMessage({ ok: false, text: res.error })
    })
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-6">
        <Section title="Search engines" hint="Leave a field empty to use the value generated from the page content.">
          <Field label="SEO title" count={preview.title.length} max={TITLE_MAX}>
            <Input value={form.seoTitle} placeholder={defaults.title} onChange={(e) => set("seoTitle", e.target.value)} />
          </Field>
          <Field label="Meta description" count={preview.description.length} max={DESCRIPTION_MAX}>
            <Textarea
              rows={3}
              value={form.metaDescription}
              placeholder={defaults.description}
              onChange={(e) => set("metaDescription", e.target.value)}
            />
          </Field>
          <Field label="Focus keywords" help="Comma separated.">
            <Input value={form.keywords} placeholder={defaults.keywords.join(", ")} onChange={(e) => set("keywords", e.target.value)} />
          </Field>
          <Field label="Canonical URL" help="Only change this if the content lives at another URL.">
            <Input value={form.canonicalUrl} placeholder={defaults.canonical} onChange={(e) => set("canonicalUrl", e.target.value)} />
          </Field>
          <label className="flex items-start gap-3 text-sm text-body">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-green"
              checked={form.noindex}
              onChange={(e) => set("noindex", e.target.checked)}
            />
            <span>
              <span className="font-medium text-heading">Hide from search engines (noindex)</span>
              <span className="block text-muted-2">The page also drops out of the XML sitemap.</span>
            </span>
          </label>
        </Section>

        <Section title="Social sharing" hint="Used by WhatsApp, LinkedIn, Facebook and X link previews. Use a 1200 × 630 image.">
          <Field label="Share title">
            <Input value={form.ogTitle} placeholder={defaults.ogTitle} onChange={(e) => set("ogTitle", e.target.value)} />
          </Field>
          <Field label="Share description">
            <Textarea rows={2} value={form.ogDescription} placeholder={defaults.ogDescription} onChange={(e) => set("ogDescription", e.target.value)} />
          </Field>
          <Field label="Share image URL" help="An https:// URL or a site path such as /images/banner.png.">
            <Input value={form.ogImage} placeholder={defaults.ogImage} onChange={(e) => set("ogImage", e.target.value)} />
          </Field>
          <details className="rounded-lg border border-line p-4">
            <summary className="cursor-pointer text-sm font-medium text-heading">X (Twitter) overrides</summary>
            <div className="mt-4 flex flex-col gap-4">
              <Field label="X title">
                <Input value={form.twitterTitle} placeholder={preview.ogTitle} onChange={(e) => set("twitterTitle", e.target.value)} />
              </Field>
              <Field label="X description">
                <Textarea rows={2} value={form.twitterDescription} placeholder={preview.ogDescription} onChange={(e) => set("twitterDescription", e.target.value)} />
              </Field>
              <Field label="X image URL">
                <Input value={form.twitterImage} placeholder={preview.ogImage} onChange={(e) => set("twitterImage", e.target.value)} />
              </Field>
            </div>
          </details>
        </Section>

        {kind === "event" && (
          <Section title="Event details" hint="Adds the fields Google needs for event rich results.">
            <div className="grid gap-4 md:grid-cols-2">
              {EVENT_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  <Input value={form.extra[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setExtra(f.key, e.target.value)} />
                </Field>
              ))}
            </div>
          </Section>
        )}

        <Section title="Custom structured data" hint="Optional JSON-LD added to the generated schema graph.">
          <Textarea
            rows={6}
            className="font-mono text-xs"
            value={form.customSchema}
            placeholder='{"@type": "FAQPage", "mainEntity": []}'
            aria-label="Custom JSON-LD"
            onChange={(e) => set("customSchema", e.target.value)}
          />
        </Section>

        <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4 md:flex-row md:items-center">
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" className="size-4 accent-green" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
            Publish these overrides
          </label>
          <div className="flex flex-1 items-center justify-end gap-2">
            {override && (
              <button
                type="button"
                onClick={reset}
                disabled={pending}
                className="h-9 rounded-lg border border-line bg-background px-4 text-sm font-medium text-body hover:border-destructive hover:text-destructive disabled:opacity-50"
              >
                Reset to defaults
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-green px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Save SEO
            </button>
          </div>
        </div>
        {message && (
          <p role="status" className={`text-sm ${message.ok ? "text-green" : "text-destructive"}`}>
            {message.text}
          </p>
        )}
      </div>

      <aside className="flex flex-col gap-6">
        <Section title="Google preview">
          <div className="flex flex-col gap-1">
            <p className="truncate text-xs text-muted-2">{preview.url}</p>
            <p className="text-lg leading-snug text-[#1a0dab] text-pretty">{preview.title}</p>
            <p className="text-sm leading-relaxed text-body text-pretty">{preview.description}</p>
          </div>
        </Section>

        <Section title="Social card preview">
          <div className="overflow-hidden rounded-lg border border-line">
            {preview.ogImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.ogImage} alt="Share image preview" className="aspect-[1200/630] w-full bg-surface object-cover" />
            ) : (
              <div className="flex aspect-[1200/630] items-center justify-center bg-surface text-sm text-muted-2">No image</div>
            )}
            <div className="flex flex-col gap-1 bg-surface p-3">
              <p className="text-xs uppercase text-muted-2">{siteName}</p>
              <p className="font-medium text-heading">{preview.ogTitle}</p>
              <p className="line-clamp-2 text-sm text-body">{preview.ogDescription}</p>
            </div>
          </div>
        </Section>

        <Section title="Audit" hint="Reflects the last saved version.">
          <ul className="flex flex-col gap-2">
            {issues.length === 0 && <li className="text-sm text-green">No issues found.</li>}
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-body">
                {issue.level === "error" ? (
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Error" />
                ) : issue.level === "warning" ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-heading" aria-label="Warning" />
                ) : (
                  <Info className="mt-0.5 size-4 shrink-0 text-muted-2" aria-label="Info" />
                )}
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <a
              className="font-medium text-green hover:underline"
              href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(defaults.canonical)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Rich Results Test
            </a>
            <a
              className="font-medium text-green hover:underline"
              href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(defaults.canonical)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook debugger
            </a>
            <a className="font-medium text-green hover:underline" href={path} target="_blank" rel="noopener noreferrer">
              Open page
            </a>
          </div>
        </Section>

        <details className="rounded-xl border border-line bg-card p-5">
          <summary className="cursor-pointer text-sm font-bold text-heading">Generated JSON-LD</summary>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-surface p-3 font-mono text-xs text-body">{jsonLd}</pre>
        </details>
      </aside>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-card p-5">
      <div>
        <h2 className="text-base font-bold text-heading">{title}</h2>
        {hint && <p className="mt-1 text-sm text-muted-2">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  help,
  count,
  max,
  children,
}: {
  label: string
  help?: string
  count?: number
  max?: number
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm font-medium text-heading">
        {label}
        {count !== undefined && max !== undefined && (
          <span className={`text-xs font-normal ${count > max ? "text-destructive" : "text-muted-2"}`}>
            {count}/{max}
          </span>
        )}
      </span>
      {children}
      {help && <span className="text-xs text-muted-2">{help}</span>}
    </label>
  )
}

"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { History, Monitor, RotateCcw, Send, Smartphone, Upload, Save, Trash2, Bold, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EmailContent, EmailVariable } from "@/lib/email-templates/registry"
import { renderEmail } from "@/lib/email-templates/render"
import {
  discardEmailDraft,
  publishEmailTemplate,
  restoreEmailVersion,
  saveEmailDraft,
  sendTestEmail,
} from "@/app/actions/email-templates"

type Meta = {
  publishedVersion: number
  publishedAt: string | null
  publishedBy: string | null
  draftUpdatedAt: string | null
  draftUpdatedBy: string | null
}

type Version = { id: number; version: number; publishedBy: string | null; createdAt: string; subject: string }

type Props = {
  templateKey: string
  defaults: EmailContent
  live: EmailContent
  draft: EmailContent | null
  variables: EmailVariable[]
  baseUrl: string
  supportEmail: string
  meta: Meta
  versions: Version[]
  adminEmail: string
}

type Notice = { tone: "ok" | "error"; text: string } | null

const inputClass =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-body outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/20"

function formatDate(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
}

function same(a: EmailContent, b: EmailContent) {
  return (Object.keys(a) as (keyof EmailContent)[]).every((k) => a[k] === b[k])
}

export function EmailTemplateEditor(props: Props) {
  const { templateKey, defaults, live, draft, variables, baseUrl, supportEmail, meta, versions, adminEmail } = props
  const router = useRouter()
  const [form, setForm] = useState<EmailContent>(draft ?? live)
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")
  const [testTo, setTestTo] = useState(adminEmail)
  const [notice, setNotice] = useState<Notice>(null)
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  const sample = useMemo(() => Object.fromEntries(variables.map((v) => [v.name, v.sample])), [variables])
  const rendered = useMemo(() => renderEmail(form, sample, { baseUrl, supportEmail }), [form, sample, baseUrl, supportEmail])

  const dirtyFromLive = !same(form, live)
  const savedBaseline = draft ?? live
  const unsaved = !same(form, savedBaseline)

  const set = <K extends keyof EmailContent>(key: K, value: EmailContent[K]) => setForm((f) => ({ ...f, [key]: value }))

  function run(label: string, action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setBusy(label)
    setNotice(null)
    startTransition(async () => {
      const res = await action()
      setBusy(null)
      setNotice(res.ok ? { tone: "ok", text: res.message ?? "Done." } : { tone: "error", text: res.error ?? "Something went wrong." })
      if (res.ok) router.refresh()
    })
  }

  function wrapBody(before: string, after: string, placeholder: string) {
    const el = document.getElementById("email-body") as HTMLTextAreaElement | null
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const selected = value.slice(s, e) || placeholder
    const next = value.slice(0, s) + before + selected + after + value.slice(e)
    set("body", next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + before.length, s + before.length + selected.length)
    })
  }

  function insertVariable(name: string) {
    const el = document.getElementById("email-body") as HTMLTextAreaElement | null
    const token = `{{${name}}}`
    if (!el) return set("body", `${form.body}${token}`)
    const { selectionStart: s, selectionEnd: e, value } = el
    set("body", value.slice(0, s) + token + value.slice(e))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + token.length, s + token.length)
    })
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-semibold text-heading">
            Live: {meta.publishedVersion > 0 ? `Version ${meta.publishedVersion}` : "Default template"}
          </span>
          {meta.publishedAt && (
            <span className="text-muted-2">
              Published {formatDate(meta.publishedAt)}
              {meta.publishedBy ? ` by ${meta.publishedBy}` : ""}
            </span>
          )}
          {draft && (
            <span className="rounded-full bg-gold-tint px-2.5 py-0.5 text-xs font-semibold text-heading">
              Draft saved {formatDate(meta.draftUpdatedAt)}
            </span>
          )}
          {unsaved && <span className="text-xs font-semibold text-muted-2">Unsaved changes</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {draft && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm("Discard the saved draft? The live email is not affected.")) return
                run("discard", async () => {
                  const r = await discardEmailDraft(templateKey)
                  if (r.ok) setForm(live)
                  return r
                })
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-body transition-colors hover:bg-mint disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Discard draft
            </button>
          )}
          <button
            type="button"
            disabled={pending || !unsaved}
            onClick={() => run("save", () => saveEmailDraft(templateKey, form))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-body transition-colors hover:bg-mint disabled:opacity-50"
          >
            <Save className="size-4" aria-hidden="true" />
            {busy === "save" ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            disabled={pending || (!dirtyFromLive && meta.publishedVersion > 0)}
            onClick={() => {
              if (!confirm("Publish these changes? All future emails of this type will use this version.")) return
              run("publish", () => publishEmailTemplate(templateKey, form))
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-50"
          >
            <Upload className="size-4" aria-hidden="true" />
            {busy === "publish" ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-4 py-3 text-sm font-medium",
            notice.tone === "ok" ? "bg-mint text-green" : "bg-destructive/10 text-destructive",
          )}
        >
          {notice.text}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="content-h" className="rounded-xl border border-line bg-card p-5">
            <h2 id="content-h" className="text-base font-bold text-heading">
              Content
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              <Field label="Subject line" htmlFor="email-subject">
                <input id="email-subject" value={form.subject} maxLength={200} onChange={(e) => set("subject", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Heading" htmlFor="email-heading">
                <input id="email-heading" value={form.heading} maxLength={200} onChange={(e) => set("heading", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Body" htmlFor="email-body" hint="Leave a blank line between paragraphs. A paragraph that uses an empty variable is hidden automatically.">
                <div className="flex gap-1 rounded-t-lg border border-b-0 border-line bg-surface px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => wrapBody("**", "**", "bold text")}
                    className="inline-flex size-7 items-center justify-center rounded text-body hover:bg-card"
                    aria-label="Bold"
                    title="Bold"
                  >
                    <Bold className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapBody("[", "](https://)", "link text")}
                    className="inline-flex size-7 items-center justify-center rounded text-body hover:bg-card"
                    aria-label="Insert link"
                    title="Insert link"
                  >
                    <Link2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <textarea
                  id="email-body"
                  rows={9}
                  value={form.body}
                  maxLength={8000}
                  onChange={(e) => set("body", e.target.value)}
                  className={cn(inputClass, "rounded-t-none font-mono leading-relaxed")}
                />
              </Field>
              {variables.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-2">Insert variable</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variables.map((v) => (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => insertVariable(v.name)}
                        title={v.description}
                        className="rounded-md border border-green-border bg-mint px-2 py-1 font-mono text-xs text-green hover:bg-mint-2"
                      >
                        {`{{${v.name}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Footnote" htmlFor="email-footnote" hint="Small print shown below the button. Optional.">
                <textarea id="email-footnote" rows={2} value={form.footnote} maxLength={1500} onChange={(e) => set("footnote", e.target.value)} className={inputClass} />
              </Field>
            </div>
          </section>

          <section aria-labelledby="button-h" className="rounded-xl border border-line bg-card p-5">
            <h2 id="button-h" className="text-base font-bold text-heading">
              Button & branding
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Button label" htmlFor="email-cta-label" hint="Clear both fields to hide the button.">
                <input id="email-cta-label" value={form.ctaLabel} maxLength={80} onChange={(e) => set("ctaLabel", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Button link" htmlFor="email-cta-url" hint="A full URL, a site path like /dashboard, or a variable.">
                <input id="email-cta-url" value={form.ctaUrl} maxLength={500} onChange={(e) => set("ctaUrl", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Header label" htmlFor="email-header">
                <input id="email-header" value={form.headerLabel} maxLength={80} onChange={(e) => set("headerLabel", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Brand colour" htmlFor="email-accent">
                <div className="flex gap-2">
                  <input
                    type="color"
                    aria-label="Pick brand colour"
                    value={/^#[0-9a-fA-F]{6}$/.test(form.accentColor) ? form.accentColor : defaults.accentColor}
                    onChange={(e) => set("accentColor", e.target.value)}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-card p-1"
                  />
                  <input id="email-accent" value={form.accentColor} maxLength={7} onChange={(e) => set("accentColor", e.target.value)} className={cn(inputClass, "font-mono")} />
                </div>
              </Field>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm("Replace the editor content with the original default template? Nothing is saved until you save or publish.")) setForm(defaults)
              }}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-2 hover:text-heading"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset editor to original default
            </button>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="preview-h" className="rounded-xl border border-line bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="preview-h" className="text-base font-bold text-heading">
                Preview
              </h2>
              <div role="group" aria-label="Preview device" className="inline-flex rounded-lg border border-line p-0.5">
                {(
                  [
                    { id: "desktop", label: "Desktop", icon: Monitor },
                    { id: "mobile", label: "Mobile", icon: Smartphone },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={device === d.id}
                    onClick={() => setDevice(d.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                      device === d.id ? "bg-green text-white" : "text-body hover:bg-mint",
                    )}
                  >
                    <d.icon className="size-3.5" aria-hidden="true" />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-line-light bg-surface px-3 py-2 text-sm">
              <span className="text-muted-2">Subject: </span>
              <span className="font-semibold text-heading">{rendered.subject}</span>
            </div>
            <div className="mt-3 flex justify-center overflow-hidden rounded-lg bg-surface p-3">
              <iframe
                title={`${device} email preview`}
                srcDoc={rendered.html}
                sandbox=""
                className={cn("h-[640px] rounded-md border border-line bg-card transition-[width]", device === "desktop" ? "w-full" : "w-[375px] max-w-full")}
              />
            </div>
            <p className="mt-2 text-xs text-muted-2">Variables are filled with sample values in the preview and test emails.</p>
          </section>

          <section aria-labelledby="test-h" className="rounded-xl border border-line bg-card p-5">
            <h2 id="test-h" className="text-base font-bold text-heading">
              Send test email
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-2">Sends exactly what is in the editor, including unsaved changes, with a [TEST] subject prefix.</p>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault()
                run("test", () => sendTestEmail(templateKey, form, testTo))
              }}
            >
              <label htmlFor="test-to" className="sr-only">
                Test recipient email
              </label>
              <input id="test-to" type="email" required value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="name@example.com" className={inputClass} />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
              >
                <Send className="size-4" aria-hidden="true" />
                {busy === "test" ? "Sending..." : "Send test"}
              </button>
            </form>
          </section>

          <section aria-labelledby="versions-h" className="rounded-xl border border-line bg-card p-5">
            <h2 id="versions-h" className="flex items-center gap-2 text-base font-bold text-heading">
              <History className="size-4" aria-hidden="true" />
              Version history
            </h2>
            {versions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-2">No published versions yet. The original default template is live.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line-light">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-heading">
                        Version {v.version}
                        {v.version === meta.publishedVersion && (
                          <span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-xs font-semibold text-green">Live</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-2">
                        {formatDate(v.createdAt)}
                        {v.publishedBy ? ` · ${v.publishedBy}` : ""} · {v.subject}
                      </p>
                    </div>
                    {v.version !== meta.publishedVersion && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run("restore", async () => {
                            const r = await restoreEmailVersion(templateKey, v.id)
                            return r
                          })
                        }
                        className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-body hover:bg-mint disabled:opacity-50"
                      >
                        Restore
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-heading">
        {label}
      </label>
      <div>{children}</div>
      {hint && <p className="text-xs leading-relaxed text-muted-2">{hint}</p>}
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react"
import {
  generateLeadershipSections,
  publishLeadershipProfile,
  rejectLeadershipChanges,
  saveLeadershipDraft,
  type getLeadershipStudio,
} from "@/app/actions/leadership"
import { AI_SECTIONS, LEADERSHIP_SECTIONS, STATUS_LABELS, type AiSection, type ProfileContent, type ProfileField } from "@/lib/leadership"
import { RichTextField } from "@/components/admin/rich-text-editor"
import { PhotoUpload } from "@/components/leadership/photo-upload"
import { DeleteLeadershipButton } from "./delete-button"

type StudioData = NonNullable<Awaited<ReturnType<typeof getLeadershipStudio>>>

const input =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-heading focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
const KINDS = LEADERSHIP_SECTIONS.flatMap((s) => [...s.kinds])
const SOCIAL: [ProfileField, string][] = [
  ["linkedin", "LinkedIn"],
  ["x", "X (Twitter)"],
  ["website", "Website"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["email", "Public email"],
]

export function LeadershipStudio({ data }: { data: StudioData }) {
  const router = useRouter()
  const [content, setContent] = useState<ProfileContent>(data.draft ?? data.live)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()

  const set = (field: ProfileField, value: string) => setContent((c) => ({ ...c, [field]: value }))
  const isApplication = !data.published

  function run(label: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setBusy(label)
    setNotice(null)
    startTransition(async () => {
      try {
        const r = await fn()
        setNotice({ ok: r.ok, text: (r.ok ? r.message : r.error) ?? "Done." })
        if (r.ok) router.refresh()
      } catch (e) {
        setNotice({ ok: false, text: (e as Error).message })
      } finally {
        setBusy(null)
      }
    })
  }

  function generate(sections: AiSection[]) {
    const label = sections.length > 1 ? "ai:all" : `ai:${sections[0]}`
    setBusy(label)
    setNotice(null)
    startTransition(async () => {
      try {
        const r = await generateLeadershipSections(data.id, sections, content)
        if (!r.ok) {
          setNotice({ ok: false, text: r.error })
          return
        }
        setContent((c) => ({ ...c, ...r.sections }))
        setNotice({ ok: true, text: "AI draft ready. Review every section, then save or publish." })
      } catch (e) {
        setNotice({ ok: false, text: (e as Error).message })
      } finally {
        setBusy(null)
      }
    })
  }

  const disabled = busy !== null || uploading

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-2">
            {STATUS_LABELS[data.status] ?? data.status}
            {data.draft && data.published && " · unpublished draft changes"}
          </p>
          <h1 className="font-serif text-2xl font-bold text-heading text-balance">{content.name || "Untitled profile"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <DeleteLeadershipButton id={data.id} name={content.name} variant="button" redirectTo="/admin/leadership" />
          {data.published && (
            <a href={data.path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-heading hover:border-green">
              Live profile <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
          <button
            type="button"
            onClick={() => generate(AI_SECTIONS.map((s) => s.key))}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-lg border border-green px-3 py-2 text-sm font-semibold text-green hover:bg-green/10 disabled:opacity-50"
          >
            {busy === "ai:all" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            Generate with AI
          </button>
          <button
            type="button"
            onClick={() => run("save", () => saveLeadershipDraft(data.id, content))}
            disabled={disabled}
            className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-heading hover:border-green disabled:opacity-50"
          >
            {busy === "save" ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={() => run("publish", () => publishLeadershipProfile(data.id, content))}
            disabled={disabled}
            className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green/90 disabled:opacity-50"
          >
            {busy === "publish" ? "Publishing…" : "Approve & publish"}
          </button>
        </div>
      </header>

      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={notice.ok ? "text-sm text-green" : "text-sm text-destructive"}>
          {notice.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-xl border border-line bg-card p-5">
            <h2 className="font-semibold text-heading">Identity</h2>
            <PhotoUpload value={content.photo} onChange={(url) => set("photo", url)} onBusyChange={setUploading} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField id="name" label="Full name" value={content.name} onChange={(v) => set("name", v)} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="kind" className="text-sm font-medium text-heading">Leadership group</label>
                <select id="kind" value={content.kind} onChange={(e) => set("kind", e.target.value)} className={input}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <TextField id="title" label="Professional title" value={content.title} onChange={(v) => set("title", v)} />
              <TextField id="organization" label="Organization" value={content.organization} onChange={(v) => set("organization", v)} />
              <TextField id="position" label="VAAP position / designation" value={content.position} onChange={(v) => set("position", v)} />
              <TextField id="portfolio" label="Portfolio" value={content.portfolio} onChange={(v) => set("portfolio", v)} />
            </div>
          </section>

          <section className="flex flex-col gap-5 rounded-xl border border-line bg-card p-5">
            <h2 className="font-semibold text-heading">Profile content</h2>
            <AiBlock label="Profile summary" busy={busy === "ai:summary"} disabled={disabled} onRegenerate={() => generate(["summary"])}>
              <textarea id="summary" aria-label="Profile summary" rows={3} value={content.summary} onChange={(e) => set("summary", e.target.value)} className={`${input} leading-relaxed`} />
            </AiBlock>
            <AiBlock label="Professional biography" busy={busy === "ai:bio"} disabled={disabled} onRegenerate={() => generate(["bio"])}>
              <RichTextField value={content.bio} onChange={(html) => set("bio", html)} disabled={busy !== null} />
            </AiBlock>
            <AiBlock label="Responsibilities" busy={busy === "ai:responsibility"} disabled={disabled} onRegenerate={() => generate(["responsibility"])}>
              <textarea aria-label="Responsibilities" rows={3} value={content.responsibility} onChange={(e) => set("responsibility", e.target.value)} className={`${input} leading-relaxed`} />
            </AiBlock>
            <AiBlock label="Message to the community" busy={busy === "ai:message"} disabled={disabled} onRegenerate={() => generate(["message"])}>
              <textarea aria-label="Message to the community" rows={4} value={content.message} onChange={(e) => set("message", e.target.value)} className={`${input} leading-relaxed`} />
            </AiBlock>
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-line bg-card p-5">
            <h2 className="font-semibold text-heading">Links</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {SOCIAL.map(([field, label]) => (
                <TextField key={field} id={field} label={label} value={content[field]} onChange={(v) => set(field, v)} />
              ))}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          {(data.contactEmail || data.contactPhone) && (
            <section className="flex flex-col gap-1 rounded-xl border border-line bg-card p-4 text-sm">
              <h2 className="font-semibold text-heading">Private contact</h2>
              {data.contactEmail && <a href={`mailto:${data.contactEmail}`} className="break-all text-green hover:underline">{data.contactEmail}</a>}
              {data.contactPhone && <span className="text-muted-2">{data.contactPhone}</span>}
            </section>
          )}

          {data.submission && (
            <details className="rounded-xl border border-line bg-card p-4 text-sm" open={isApplication}>
              <summary className="cursor-pointer font-semibold text-heading">Original application</summary>
              <dl className="mt-3 flex flex-col gap-2">
                {Object.entries(data.submission)
                  .filter(([k, v]) => v && !["photo", "summary"].includes(k))
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs uppercase tracking-wide text-muted-2">{k}</dt>
                      <dd className="whitespace-pre-line break-words leading-relaxed text-heading">{v.replace(/<[^>]+>/g, "\n").trim()}</dd>
                    </div>
                  ))}
              </dl>
            </details>
          )}

          <section className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4">
            <h2 className="text-sm font-semibold text-heading">{data.published ? "Discard draft" : "Reject application"}</h2>
            {!data.published && (
              <textarea
                aria-label="Reason for rejection"
                rows={3}
                placeholder="Reason shared with the applicant"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className={`${input} leading-relaxed`}
              />
            )}
            <button
              type="button"
              onClick={() => run("reject", () => rejectLeadershipChanges(data.id, rejectNote))}
              disabled={disabled || (data.published && !data.draft)}
              className="w-fit rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-destructive hover:border-destructive disabled:opacity-50"
            >
              {data.published ? "Discard draft changes" : "Reject"}
            </button>
          </section>

          <section className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4">
            <h2 className="text-sm font-semibold text-heading">History</h2>
            {data.revisions.length === 0 ? (
              <p className="text-sm text-muted-2">No changes recorded yet.</p>
            ) : (
              <ol className="flex flex-col gap-2 text-sm">
                {data.revisions.map((r) => (
                  <li key={r.id} className="flex flex-col">
                    <span className="text-heading">{r.action.replace(/[_:]/g, " ")}</span>
                    <span className="text-xs text-muted-2">
                      {r.actorName || "Unknown"} · {new Date(r.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    {r.note && <span className="text-xs text-muted-2">{r.note}</span>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function TextField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-heading">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={input} />
    </div>
  )
}

function AiBlock({
  label,
  busy,
  disabled,
  onRegenerate,
  children,
}: {
  label: string
  busy: boolean
  disabled: boolean
  onRegenerate: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-heading">{label}</span>
        <button type="button" onClick={onRegenerate} disabled={disabled} className="inline-flex items-center gap-1 text-xs font-medium text-green hover:underline disabled:opacity-50">
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
          Regenerate
        </button>
      </div>
      {children}
    </div>
  )
}

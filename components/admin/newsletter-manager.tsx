"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Send, Copy, Trash2, Eye, Users, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/admin/rich-text-editor"
import {
  addNewsletterSubscribers,
  cancelNewsletter,
  deleteNewsletter,
  duplicateNewsletter,
  getNewsletterStats,
  previewAudience,
  retryFailedRecipients,
  saveNewsletter,
  scheduleNewsletter,
  sendNewsletterTest,
  setSubscriberStatus,
} from "@/app/actions/newsletters"
import type { NewsletterAudience } from "@/lib/db/schema"

type Campaign = {
  id: number
  title: string
  subject: string
  previewText: string
  bannerUrl: string | null
  bodyHtml: string
  ctaLabel: string | null
  ctaUrl: string | null
  audience: NewsletterAudience
  audienceLabel: string
  status: string
  scheduledAt: string | null
  completedAt: string | null
  totalRecipients: number
  updatedByName: string
  updatedAt: string
}

type Subscriber = { id: number; email: string; name: string; status: string; source: string; createdAt: string }
type Stats = Awaited<ReturnType<typeof getNewsletterStats>>
type Msg = { tone: "ok" | "error"; text: string } | null

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—")

const STATUS_TONE: Record<string, string> = {
  draft: "bg-surface text-body",
  scheduled: "bg-blue-tint text-heading",
  sending: "bg-amber-tint text-heading",
  sent: "bg-green-light text-green",
  cancelled: "bg-warning-bg text-destructive",
}

function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null
  return (
    <p role="status" className={`rounded-lg px-4 py-3 text-sm ${msg.tone === "ok" ? "bg-green-light text-green" : "bg-warning-bg text-destructive"}`}>
      {msg.text}
    </p>
  )
}

export function NewsletterManager({ campaigns, subscribers, categories, canSend }: { campaigns: Campaign[]; subscribers: Subscriber[]; categories: string[]; canSend: boolean }) {
  const [tab, setTab] = useState<"campaigns" | "subscribers">("campaigns")
  const [editing, setEditing] = useState<Campaign | "new" | null>(null)

  if (editing) {
    return <CampaignEditor key={editing === "new" ? "new" : editing.id} campaign={editing === "new" ? null : editing} categories={categories} canSend={canSend} onClose={() => setEditing(null)} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Newsletter sections" className="flex gap-1 rounded-lg border border-line bg-card p-1">
          {(["campaigns", "subscribers"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-green text-primary-foreground" : "text-body hover:bg-surface"}`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "campaigns" && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden="true" />
            New newsletter
          </Button>
        )}
      </div>
      {tab === "campaigns" ? <CampaignList campaigns={campaigns} canSend={canSend} onEdit={setEditing} /> : <SubscriberList subscribers={subscribers} canManage={canSend} />}
    </div>
  )
}

function CampaignList({ campaigns, canSend, onEdit }: { campaigns: Campaign[]; canSend: boolean; onEdit: (c: Campaign) => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<Msg>(null)
  const [statsFor, setStatsFor] = useState<number | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setMsg(null)
    start(async () => {
      const res = await fn()
      setMsg(res.ok ? { tone: "ok", text: ok } : { tone: "error", text: res.error ?? "Failed." })
      router.refresh()
    })
  }

  function toggleStats(id: number) {
    if (statsFor === id) return setStatsFor(null)
    setStatsFor(id)
    setStats(null)
    start(async () => setStats(await getNewsletterStats(id)))
  }

  if (campaigns.length === 0) {
    return <p className="rounded-xl border border-line bg-card p-6 text-sm text-muted-2">No newsletters yet. Create one to get started.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <Notice msg={msg} />
      {campaigns.map((c) => {
        const editable = c.status === "draft" || c.status === "scheduled"
        return (
          <article key={c.id} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-pretty font-semibold text-heading">{c.title}</h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_TONE[c.status] ?? STATUS_TONE.draft}`}>{c.status}</span>
                </div>
                <p className="text-sm text-muted-2">
                  {c.audienceLabel}
                  {c.totalRecipients ? ` · ${c.totalRecipients.toLocaleString()} recipients` : ""}
                  {c.status === "scheduled" ? ` · sends ${fmt(c.scheduledAt)}` : ""}
                  {c.status === "sent" ? ` · finished ${fmt(c.completedAt)}` : ""}
                  {` · edited by ${c.updatedByName || "—"} ${fmt(c.updatedAt)}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {editable && (
                  <Button size="sm" variant="outline" onClick={() => onEdit(c)}>
                    Edit
                  </Button>
                )}
                {!editable && (
                  <Button size="sm" variant="outline" onClick={() => toggleStats(c.id)} aria-expanded={statsFor === c.id}>
                    <BarChart3 className="size-4" aria-hidden="true" />
                    Report
                  </Button>
                )}
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => duplicateNewsletter(c.id), "Copy created as a draft.")} aria-label={`Duplicate ${c.title}`}>
                  <Copy className="size-4" aria-hidden="true" />
                </Button>
                {canSend && (c.status === "scheduled" || c.status === "sending") && (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => confirm("Stop sending this newsletter?") && run(() => cancelNewsletter(c.id), "Newsletter cancelled.")}>
                    Cancel
                  </Button>
                )}
                {editable && (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => confirm("Delete this newsletter?") && run(() => deleteNewsletter(c.id), "Newsletter deleted.")} aria-label={`Delete ${c.title}`}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
            {statsFor === c.id && (
              <div className="flex flex-col gap-3 border-t border-line-light pt-3">
                {!stats ? (
                  <Loader2 className="size-4 animate-spin text-muted-2" aria-label="Loading report" />
                ) : (
                  <>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {(
                        [
                          ["Sent", stats.stats.sent],
                          ["Queued", stats.stats.queued],
                          ["Opened", stats.stats.opened],
                          ["Clicked", stats.stats.clicked],
                          ["Failed", stats.stats.failed],
                          ["Bounced", stats.stats.bounced],
                          ["Unsubscribed", stats.stats.unsubscribed],
                          ["Open rate", stats.stats.sent ? `${Math.round((stats.stats.opened / stats.stats.sent) * 100)}%` : "—"],
                        ] as const
                      ).map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-surface p-3">
                          <dt className="text-xs text-muted-2">{label}</dt>
                          <dd className="text-lg font-semibold text-heading">{typeof value === "number" ? value.toLocaleString() : value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-xs text-muted-2">Open counts rely on image loading, so some mail apps under-report them.</p>
                    {stats.recentFailures.length > 0 && (
                      <ul className="flex flex-col gap-1 text-xs text-body">
                        {stats.recentFailures.map((f) => (
                          <li key={f.email}>
                            {f.email} · {f.status} · {f.error ?? "—"}
                          </li>
                        ))}
                      </ul>
                    )}
                    {canSend && stats.stats.failed > 0 && (
                      <Button size="sm" variant="outline" className="w-fit" disabled={pending} onClick={() => run(() => retryFailedRecipients(c.id), "Failed recipients queued again.")}>
                        Retry {stats.stats.failed} failed
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function CampaignEditor({ campaign, categories, canSend, onClose }: { campaign: Campaign | null; categories: string[]; canSend: boolean; onClose: () => void }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [id, setId] = useState<number | null>(campaign?.id ?? null)
  const [audienceType, setAudienceType] = useState<NewsletterAudience["type"]>(campaign?.audience.type ?? "all")
  const [busy, setBusy] = useState(false)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<Msg>(null)
  const [reach, setReach] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState("")
  const [scheduleAt, setScheduleAt] = useState(campaign?.scheduledAt ? campaign.scheduledAt.slice(0, 16) : "")

  async function save(): Promise<number | null> {
    if (!formRef.current) return null
    const res = await saveNewsletter(id, new FormData(formRef.current))
    if (!res.ok) {
      setMsg({ tone: "error", text: res.error })
      return null
    }
    setId(res.id)
    return res.id
  }

  function run(fn: () => Promise<void>) {
    setMsg(null)
    start(fn)
  }

  function buildPreview() {
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!)
    const banner = String(fd.get("bannerUrl") ?? "")
    const cta = String(fd.get("ctaLabel") ?? "")
    const ctaUrl = String(fd.get("ctaUrl") ?? "")
    setPreviewHtml(`<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#fff;padding:24px">
${banner ? `<img src="${esc(banner)}" alt="" style="width:100%;border-radius:8px;margin-bottom:16px"/>` : ""}
<h1 style="color:#14532d;font-size:24px;margin:0 0 16px">${esc(String(fd.get("title") ?? ""))}</h1>
<div style="color:#1f2937;font-size:15px;line-height:1.6">${String(fd.get("bodyHtml") ?? "")}</div>
${cta && ctaUrl ? `<p style="margin-top:24px"><a href="#" style="background:#15803d;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${esc(cta)}</a></p>` : ""}
<p style="margin-top:32px;font-size:12px;color:#6b7280">You are receiving this because you are a VAAP member or subscribed to VAAP updates. Unsubscribe</p>
</div></body></html>`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-bold text-heading">{campaign ? "Edit newsletter" : "New newsletter"}</h2>
        <Button
          variant="ghost"
          onClick={() => {
            router.refresh()
            onClose()
          }}
        >
          {"← Back to newsletters"}
        </Button>
      </div>
      <Notice msg={msg} />

      <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-card p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-title">Title</Label>
            <Input id="nl-title" name="title" required maxLength={200} defaultValue={campaign?.title} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nl-subject">Email subject</Label>
              <Input id="nl-subject" name="subject" maxLength={200} defaultValue={campaign?.subject} placeholder="Defaults to the title" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nl-preview">Preview text</Label>
              <Input id="nl-preview" name="previewText" maxLength={300} defaultValue={campaign?.previewText} placeholder="Shown next to the subject in inboxes" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nl-banner">Banner image URL</Label>
            <Input id="nl-banner" name="bannerUrl" defaultValue={campaign?.bannerUrl ?? ""} placeholder="https://…" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-heading">Content</span>
            <RichTextEditor name="bodyHtml" defaultValue={campaign?.bodyHtml ?? ""} imageUpload onBusyChange={setBusy} placeholder="Write your newsletter…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nl-cta">Button label</Label>
              <Input id="nl-cta" name="ctaLabel" maxLength={80} defaultValue={campaign?.ctaLabel ?? ""} placeholder="Optional" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nl-cta-url">Button link</Label>
              <Input id="nl-cta-url" name="ctaUrl" defaultValue={campaign?.ctaUrl ?? ""} placeholder="https://vaap.org.pk/…" />
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
            <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-heading">
              <Users className="size-4 text-green" aria-hidden="true" />
              Audience
            </legend>
            {(
              [
                ["all", "All subscribers"],
                ["members", "Members only"],
                ["non-members", "Non-members only"],
                ["custom", "Custom selection"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-body">
                <input type="radio" name="audienceType" value={value} checked={audienceType === value} onChange={() => setAudienceType(value)} className="accent-green" />
                {label}
              </label>
            ))}
            {audienceType === "custom" && (
              <div className="flex flex-col gap-2 border-t border-line-light pt-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">Member categories</span>
                {categories.length === 0 && <span className="text-sm text-muted-2">No categories yet.</span>}
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm text-body">
                    <input type="checkbox" name="categories" value={cat} defaultChecked={campaign?.audience.categories?.includes(cat)} className="accent-green" />
                    {cat}
                  </label>
                ))}
                <span className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Non-members</span>
                <label className="flex items-center gap-2 text-sm text-body">
                  <input type="checkbox" name="segments" value="subscribers" defaultChecked={campaign?.audience.segments?.includes("subscribers")} className="accent-green" />
                  Newsletter subscribers
                </label>
                <label className="flex items-center gap-2 text-sm text-body">
                  <input type="checkbox" name="segments" value="registered" defaultChecked={campaign?.audience.segments?.includes("registered")} className="accent-green" />
                  Registered accounts
                </label>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const res = await previewAudience(new FormData(formRef.current!))
                  setReach(res.ok ? `${res.total.toLocaleString()} recipients (${res.members} members, ${res.nonMembers} non-members${res.suppressed ? `, ${res.suppressed} suppressed` : ""})` : res.error)
                })
              }
            >
              Count recipients
            </Button>
            {reach && <p className="text-sm text-body">{reach}</p>}
          </fieldset>

          <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
            <Button
              type="button"
              disabled={pending || busy}
              onClick={() =>
                run(async () => {
                  if (await save()) setMsg({ tone: "ok", text: "Draft saved." })
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Save draft
            </Button>
            <Button type="button" variant="outline" onClick={buildPreview}>
              <Eye className="size-4" aria-hidden="true" />
              Preview
            </Button>
            <div className="flex flex-col gap-2 border-t border-line-light pt-3">
              <Label htmlFor="nl-test">Send a test</Label>
              <div className="flex gap-2">
                <Input id="nl-test" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@vaap.org.pk" />
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || busy || !testEmail.includes("@")}
                  onClick={() =>
                    run(async () => {
                      const saved = await save()
                      if (!saved) return
                      const res = await sendNewsletterTest(saved, testEmail)
                      setMsg(res.ok ? { tone: "ok", text: `Test sent to ${testEmail}.` } : { tone: "error", text: res.error })
                    })
                  }
                >
                  Send
                </Button>
              </div>
            </div>
            {canSend ? (
              <div className="flex flex-col gap-2 border-t border-line-light pt-3">
                <Label htmlFor="nl-when">Schedule (optional)</Label>
                <Input id="nl-when" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                <Button
                  type="button"
                  disabled={pending || busy}
                  onClick={() =>
                    run(async () => {
                      const saved = await save()
                      if (!saved) return
                      const label = scheduleAt ? `Schedule this newsletter for ${new Date(scheduleAt).toLocaleString()}?` : "Send this newsletter now to the selected audience?"
                      if (!confirm(label)) return
                      const res = await scheduleNewsletter(saved, scheduleAt ? new Date(scheduleAt).toISOString() : null)
                      if (!res.ok) return setMsg({ tone: "error", text: res.error })
                      router.refresh()
                      onClose()
                    })
                  }
                >
                  <Send className="size-4" aria-hidden="true" />
                  {scheduleAt ? "Schedule" : "Send now"}
                </Button>
              </div>
            ) : (
              <p className="border-t border-line-light pt-3 text-sm text-muted-2">An Admin must approve and send this newsletter.</p>
            )}
          </div>
        </aside>
      </form>

      {previewHtml && (
        <section aria-label="Newsletter preview" className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-heading">Preview</h3>
            <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>
              Close
            </Button>
          </div>
          <iframe title="Newsletter preview" srcDoc={previewHtml} sandbox="" className="h-[600px] w-full rounded-lg border border-line-light bg-background" />
        </section>
      )}
    </div>
  )
}

function SubscriberList({ subscribers, canManage }: { subscribers: Subscriber[]; canManage: boolean }) {
  const router = useRouter()
  const [raw, setRaw] = useState("")
  const [consent, setConsent] = useState("")
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()

  return (
    <div className="flex flex-col gap-4">
      <Notice msg={msg} />
      {canManage && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold text-heading">Add opted-in contacts</h2>
          <p className="text-sm text-muted-2">Only add people who asked to receive VAAP emails. One per line, as an email or Name &lt;email&gt;.</p>
          <Label htmlFor="sub-raw" className="sr-only">
            Contacts
          </Label>
          <Textarea id="sub-raw" rows={4} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"ali@example.com\nSara Khan <sara@example.com>"} />
          <Label htmlFor="sub-consent">How did they consent?</Label>
          <Input id="sub-consent" value={consent} onChange={(e) => setConsent(e.target.value)} placeholder="e.g. Signed up at the Lahore summit, Nov 2026" />
          <Button
            className="w-fit"
            disabled={pending || !raw.trim() || !consent.trim()}
            onClick={() =>
              start(async () => {
                const res = await addNewsletterSubscribers(raw, consent)
                setMsg(res.ok ? { tone: "ok", text: `${res.added} added, ${res.skipped} skipped (invalid or already listed).` } : { tone: "error", text: res.error })
                if (res.ok) setRaw("")
                router.refresh()
              })
            }
          >
            Add contacts
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        {subscribers.length === 0 ? (
          <p className="p-6 text-sm text-muted-2">No non-member subscribers yet. Members receive newsletters automatically.</p>
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted-2">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-b border-line-light last:border-0">
                  <td className="px-4 py-3 text-heading">{s.email}</td>
                  <td className="px-4 py-3 text-body">{s.name || "—"}</td>
                  <td className="px-4 py-3 capitalize text-body">{s.status}</td>
                  <td className="px-4 py-3 text-muted-2">{fmt(s.createdAt)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await setSubscriberStatus(s.id, s.status === "subscribed" ? "unsubscribed" : "subscribed")
                            router.refresh()
                          })
                        }
                      >
                        {s.status === "subscribed" ? "Unsubscribe" : "Resubscribe"}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

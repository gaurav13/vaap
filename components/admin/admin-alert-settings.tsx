"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BellRing, Loader2, PencilLine, Save, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveAdminAlertSettings, sendAdminAlertTest } from "@/app/actions/admin-alerts"
import { ADMIN_ALERTS, type AdminAlertConfig, type AdminAlertType } from "@/lib/admin-alerts-shared"

type Feedback = { tone: "ok" | "error"; text: string } | null

export function AdminAlertSettings({
  initialRecipients,
  initialEnabled,
  stats,
}: {
  initialRecipients: string
  initialEnabled: AdminAlertConfig["enabled"]
  stats: Record<string, { sent: number; failed: number }>
}) {
  const router = useRouter()
  const [recipients, setRecipients] = useState(initialRecipients)
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saving, startSave] = useTransition()
  const [testing, setTesting] = useState<AdminAlertType | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [testFeedback, setTestFeedback] = useState<Record<string, Feedback>>({})

  const dirty =
    recipients.trim() !== initialRecipients || ADMIN_ALERTS.some((a) => enabled[a.type] !== initialEnabled[a.type])

  function save() {
    setFeedback(null)
    startSave(async () => {
      const res = await saveAdminAlertSettings({ recipients, enabled })
      setFeedback(res.ok ? { tone: "ok", text: res.message ?? "Saved." } : { tone: "error", text: res.error })
      if (res.ok) router.refresh()
    })
  }

  async function test(type: AdminAlertType) {
    setTesting(type)
    setTestFeedback((f) => ({ ...f, [type]: null }))
    const res = await sendAdminAlertTest(type)
    setTestFeedback((f) => ({
      ...f,
      [type]: res.ok ? { tone: "ok", text: res.message ?? "Sent." } : { tone: "error", text: res.error },
    }))
    setTesting(null)
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      <section aria-labelledby="alert-recipients" className="rounded-xl border border-line bg-card p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
            <BellRing className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="alert-recipients" className="text-base font-bold text-heading">
              Notification recipients
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-2">
              Admin alerts are sent to these addresses. Separate multiple addresses with commas (up to 5).
            </p>
            <label htmlFor="recipients" className="sr-only">
              Recipient email addresses
            </label>
            <input
              id="recipients"
              type="text"
              inputMode="email"
              autoComplete="off"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="support@vaap.org.pk"
              className="input-base mt-4 w-full max-w-xl"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="alert-types">
        <h2 id="alert-types" className="text-xs font-bold uppercase tracking-widest text-muted-2">
          Admin alerts
        </h2>
        <ul className="mt-3 divide-y divide-line-light overflow-hidden rounded-xl border border-line bg-card">
          {ADMIN_ALERTS.map((a) => {
            const on = enabled[a.type]
            const s = stats[a.templateKey]
            const fb = testFeedback[a.type]
            const switchId = `alert-${a.type}`
            return (
              <li key={a.type} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <button
                    id={switchId}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${a.label} notifications`}
                    onClick={() => setEnabled((prev) => ({ ...prev, [a.type]: !prev[a.type] }))}
                    className={cn(
                      "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2",
                      on ? "bg-green" : "bg-line",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-block size-5 rounded-full bg-card shadow-sm transition-transform",
                        on ? "translate-x-5" : "translate-x-0.5",
                      )}
                    />
                  </button>
                  <div className="min-w-0">
                    <label htmlFor={switchId} className="block cursor-pointer text-sm font-bold text-heading">
                      {a.label}
                    </label>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-2">{a.description}</p>
                    <p className="mt-1 text-xs text-muted-2">
                      {s?.sent ?? 0} sent
                      {(s?.failed ?? 0) > 0 && <span className="text-destructive"> · {s?.failed} failed</span>} · 30 days
                    </p>
                    {fb && (
                      <p role="status" className={cn("mt-1 text-xs", fb.tone === "ok" ? "text-green" : "text-destructive")}>
                        {fb.text}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 md:pl-4">
                  <button
                    type="button"
                    onClick={() => test(a.type)}
                    disabled={testing !== null || dirty}
                    title={dirty ? "Save your changes before sending a test" : undefined}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-heading transition-colors hover:border-green-border disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {testing === a.type ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="size-3.5" aria-hidden="true" />
                    )}
                    Send test
                  </button>
                  <Link
                    href={`/admin/emails/${encodeURIComponent(a.templateKey)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-heading transition-colors hover:border-green-border"
                  >
                    <PencilLine className="size-3.5" aria-hidden="true" />
                    Edit template
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          Save settings
        </button>
        {feedback && (
          <p role="status" className={cn("text-sm", feedback.tone === "ok" ? "text-green" : "text-destructive")}>
            {feedback.text}
          </p>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { WEEKDAYS, type AutomationConfig } from "@/lib/email-automations/definitions"
import type { EmailContent } from "@/lib/email-templates/registry"
import {
  addSuppression,
  approveNewsletter,
  regenerateNewsletter,
  removeSuppression,
  runAutomationNow,
  saveAutomationConfig,
  sendReminderNow,
  setAutomationEnabled,
} from "@/app/actions/email-automations"

type Automation = {
  key: string
  name: string
  description: string
  schedule: "weekly" | "on-publish" | "daily"
  marketing: boolean
  segmentName: string
  enabled: boolean
  config: AutomationConfig
  scheduleLabel: string
  lastRunAt: string | null
  totalSent: number
}
type Person = { refId: string; email: string; name: string; meta: string; createdAt: string | null }
type Run = {
  id: number
  automationKey: string
  trigger: string
  sent: number
  skipped: number
  failed: number
  note: string
  actor: string | null
  startedAt: string
}
type Suppression = { id: number; email: string; topic: string; reason: string; source: string; createdAt: string }
type Newsletter = { id: number; weekKey: string; status: string; content: EmailContent; sentCount: number; sentAt: string | null }

type Props = {
  automations: Automation[]
  segments: { key: string; name: string; description: string; count: number }[]
  pendingVerification: Person[]
  incompleteApplications: Person[]
  runs: Run[]
  suppressions: Suppression[]
  newsletters: Newsletter[]
  currentWeek: string
  events: { id: number; title: string; startsAt: string }[]
}

type Flash = { ok: boolean; message: string } | null

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"

const btnPrimary =
  "rounded-lg bg-green px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green/90 disabled:opacity-50"
const btnSecondary =
  "rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-heading transition-colors hover:bg-surface disabled:opacity-50"

export function AutomationsManager(props: Props) {
  const [flash, setFlash] = useState<Flash>(null)
  const [pending, startTransition] = useTransition()

  const act = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      try {
        setFlash(await fn())
      } catch (err) {
        setFlash({ ok: false, message: err instanceof Error ? err.message : "Something went wrong" })
      }
    })

  return (
    <div className="mt-6 flex flex-col gap-8">
      {flash ? (
        <div
          role="status"
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            flash.ok ? "border-green/30 bg-green/5 text-heading" : "border-red-300 bg-red-50 text-red-800",
          )}
        >
          {flash.message}
        </div>
      ) : null}

      <section aria-labelledby="segments-heading">
        <h2 id="segments-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-2">
          Audience segments
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          {props.segments.map((s) => (
            <li key={s.key} className="rounded-lg border border-line bg-card p-4" title={s.description}>
              <p className="text-2xl font-bold text-heading">{s.count}</p>
              <p className="mt-1 text-sm text-muted-2">{s.name}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="automations-heading" className="flex flex-col gap-3">
        <h2 id="automations-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-2">
          Workflows
        </h2>
        {props.automations.map((a) => (
          <AutomationCard key={a.key} automation={a} events={props.events} pending={pending} act={act} />
        ))}
      </section>

      <NewsletterPanel newsletters={props.newsletters} currentWeek={props.currentWeek} pending={pending} act={act} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PeopleList
          title="Pending email verification"
          automationKey="verification-reminder"
          people={props.pendingVerification}
          pending={pending}
          act={act}
        />
        <PeopleList
          title="Incomplete applications"
          automationKey="incomplete-application"
          people={props.incompleteApplications}
          pending={pending}
          act={act}
        />
      </div>

      <RunHistory runs={props.runs} automations={props.automations} />
      <Suppressions suppressions={props.suppressions} pending={pending} act={act} />
    </div>
  )
}

type ActProps = { pending: boolean; act: (fn: () => Promise<{ ok: boolean; message: string }>) => void }

function AutomationCard({ automation: a, events, pending, act }: { automation: Automation; events: Props["events"] } & ActProps) {
  const [config, setConfig] = useState<AutomationConfig>(a.config)
  const [eventId, setEventId] = useState<string>(events[0] ? String(events[0].id) : "")
  const hasSettings =
    a.schedule === "weekly" ||
    a.key === "verification-reminder" ||
    a.key === "incomplete-application" ||
    a.key === "membership-invitation"
  const reminderDays = config.reminderDays ?? [3, 7, 14]

  return (
    <article className="rounded-xl border border-line bg-card p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-heading">{a.name}</h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                a.enabled ? "bg-green/10 text-green" : "bg-surface text-muted-2",
              )}
            >
              {a.enabled ? "Active" : "Paused"}
            </span>
            {a.marketing ? <span className="text-xs text-muted-2">Includes unsubscribe link</span> : null}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-2">{a.description}</p>
          <p className="mt-2 text-xs text-muted-2">
            {a.segmentName} {" · "} {a.scheduleLabel} {" · "} Last run {fmt(a.lastRunAt)} {" · "} {a.totalSent} sent total
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-heading">
          <input
            type="checkbox"
            className="size-4 accent-green"
            checked={a.enabled}
            disabled={pending}
            onChange={(e) => act(() => setAutomationEnabled(a.key, e.target.checked))}
          />
          Enabled
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        {a.schedule === "weekly" ? (
          <Field label="Send on">
            <select
              className="rounded-lg border border-line bg-card px-3 py-2 text-sm"
              value={config.weekday ?? 1}
              onChange={(e) => setConfig({ ...config, weekday: Number(e.target.value) })}
            >
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {a.key === "newsletter" ? (
          <Field label="Approval">
            <select
              className="rounded-lg border border-line bg-card px-3 py-2 text-sm"
              value={config.mode ?? "review"}
              onChange={(e) => setConfig({ ...config, mode: e.target.value as "review" | "auto" })}
            >
              <option value="review">Draft for my review</option>
              <option value="auto">Send automatically</option>
            </select>
          </Field>
        ) : null}
        {a.key === "verification-reminder" ? (
          <>
            <Field label="Every (days)">
              <input
                type="number"
                min={1}
                max={30}
                className="w-24 rounded-lg border border-line bg-card px-3 py-2 text-sm"
                value={config.intervalDays ?? 3}
                onChange={(e) => setConfig({ ...config, intervalDays: Number(e.target.value) })}
              />
            </Field>
            <Field label="Max reminders">
              <input
                type="number"
                min={1}
                max={10}
                className="w-24 rounded-lg border border-line bg-card px-3 py-2 text-sm"
                value={config.maxReminders ?? 3}
                onChange={(e) => setConfig({ ...config, maxReminders: Number(e.target.value) })}
              />
            </Field>
          </>
        ) : null}
        {a.key === "membership-invitation" ? (
          <>
            {["Reminder 1", "Reminder 2", "Final reminder"].map((label, i) => (
              <Field key={label} label={`${label} (day)`}>
                <input
                  type="number"
                  min={1}
                  max={90}
                  className="w-24 rounded-lg border border-line bg-card px-3 py-2 text-sm"
                  value={reminderDays[i]}
                  onChange={(e) => {
                    const next = [...reminderDays]
                    next[i] = Number(e.target.value)
                    setConfig({ ...config, reminderDays: next })
                  }}
                />
              </Field>
            ))}
            <Field label="Daily limit">
              <input
                type="number"
                min={1}
                max={500}
                className="w-24 rounded-lg border border-line bg-card px-3 py-2 text-sm"
                value={config.dailyLimit ?? 100}
                onChange={(e) => setConfig({ ...config, dailyLimit: Number(e.target.value) })}
              />
            </Field>
          </>
        ) : null}
        {a.key === "incomplete-application" ? (
          <div className="flex gap-4 pb-2 text-sm text-heading">
            <span className="text-muted-2">After 24 hours, plus:</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-green"
                checked={Boolean(config.followUp3d)}
                onChange={(e) => setConfig({ ...config, followUp3d: e.target.checked })}
              />
              3 days
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-green"
                checked={Boolean(config.followUp7d)}
                onChange={(e) => setConfig({ ...config, followUp7d: e.target.checked })}
              />
              7 days
            </label>
          </div>
        ) : null}
        {a.key === "event-announcement" ? (
          <Field label="Event">
            <select
              className="max-w-xs rounded-lg border border-line bg-card px-3 py-2 text-sm"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              {events.length === 0 ? <option value="">No recent events</option> : null}
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <div className="ml-auto flex gap-2">
          {hasSettings ? (
            <button type="button" className={btnSecondary} disabled={pending} onClick={() => act(() => saveAutomationConfig(a.key, config))}>
              Save schedule
            </button>
          ) : null}
          {a.key !== "newsletter" ? (
            <button
              type="button"
              className={btnPrimary}
              disabled={pending || (a.key === "event-announcement" && !eventId)}
              onClick={() => {
                if (!confirm(`Run "${a.name}" now? Only people who have not received it yet will be emailed.`)) return
                act(() => runAutomationNow(a.key, eventId ? Number(eventId) : undefined))
              }}
            >
              {a.key === "event-announcement" ? "Announce event" : "Run now"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted-2">
      {label}
      {children}
    </label>
  )
}

function NewsletterPanel({ newsletters, currentWeek, pending, act }: { newsletters: Newsletter[]; currentWeek: string } & ActProps) {
  const [openId, setOpenId] = useState<number | null>(newsletters.find((n) => n.status === "draft")?.id ?? null)
  return (
    <section aria-labelledby="newsletter-heading" className="rounded-xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="newsletter-heading" className="font-semibold text-heading">
            Newsletter issues
          </h2>
          <p className="mt-1 text-sm text-muted-2">Drafts are built from the week&apos;s articles, events and news.</p>
        </div>
        <button
          type="button"
          className={btnSecondary}
          disabled={pending}
          onClick={() => act(() => runAutomationNow("newsletter"))}
        >
          {newsletters.some((n) => n.weekKey === currentWeek) ? "Send this week's issue" : `Create ${currentWeek} draft`}
        </button>
      </div>
      {newsletters.length === 0 ? (
        <p className="mt-4 text-sm text-muted-2">No issues yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {newsletters.map((n) => (
            <li key={n.id} className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="text-left text-sm font-semibold text-heading hover:text-green"
                  aria-expanded={openId === n.id}
                  onClick={() => setOpenId(openId === n.id ? null : n.id)}
                >
                  {n.weekKey}: {n.content.subject}
                </button>
                <span className="text-xs text-muted-2">
                  {n.status === "sent" ? `Sent to ${n.sentCount} on ${fmt(n.sentAt)}` : n.status}
                </span>
                {n.status === "draft" ? (
                  <div className="ml-auto flex gap-2">
                    <button type="button" className={btnSecondary} disabled={pending} onClick={() => act(() => regenerateNewsletter(n.id))}>
                      Rebuild
                    </button>
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={pending}
                      onClick={() => {
                        if (!confirm("Approve and send this newsletter to all confirmed members?")) return
                        act(() => approveNewsletter(n.id))
                      }}
                    >
                      Approve &amp; send
                    </button>
                  </div>
                ) : null}
              </div>
              {openId === n.id ? (
                <div className="mt-3 rounded-lg bg-surface p-4 text-sm leading-relaxed text-heading">
                  <p className="font-semibold">{n.content.heading}</p>
                  <p className="mt-2 whitespace-pre-line text-muted-2">{n.content.body}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PeopleList({
  title,
  automationKey,
  people,
  pending,
  act,
}: { title: string; automationKey: string; people: Person[] } & ActProps) {
  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <h2 className="font-semibold text-heading">{title}</h2>
      {people.length === 0 ? (
        <p className="mt-3 text-sm text-muted-2">Nobody right now.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {people.map((p) => (
            <li key={`${p.refId}-${p.email}`} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-heading">{p.name || p.email}</p>
                <p className="truncate text-xs text-muted-2">
                  {p.email}
                  {p.meta ? ` · ${p.meta}` : ""}
                  {p.createdAt ? ` · since ${fmt(p.createdAt)}` : ""}
                </p>
              </div>
              <button
                type="button"
                className={btnSecondary}
                disabled={pending || !p.refId}
                onClick={() => act(() => sendReminderNow(automationKey, p.refId))}
              >
                Send reminder
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RunHistory({ runs, automations }: { runs: Run[]; automations: Automation[] }) {
  const name = (k: string) => automations.find((a) => a.key === k)?.name ?? k
  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <h2 className="font-semibold text-heading">Recent runs</h2>
      {runs.length === 0 ? (
        <p className="mt-3 text-sm text-muted-2">No runs yet. The scheduler runs daily at 09:00 UTC.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-2">
              <tr>
                <th className="py-2 pr-4 font-semibold">When</th>
                <th className="py-2 pr-4 font-semibold">Workflow</th>
                <th className="py-2 pr-4 font-semibold">Trigger</th>
                <th className="py-2 pr-4 font-semibold">Sent</th>
                <th className="py-2 pr-4 font-semibold">Skipped</th>
                <th className="py-2 pr-4 font-semibold">Failed</th>
                <th className="py-2 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap py-2 pr-4 text-muted-2">{fmt(r.startedAt)}</td>
                  <td className="py-2 pr-4 text-heading">{name(r.automationKey)}</td>
                  <td className="py-2 pr-4 text-muted-2">{r.trigger}</td>
                  <td className="py-2 pr-4 text-heading">{r.sent}</td>
                  <td className="py-2 pr-4 text-muted-2">{r.skipped}</td>
                  <td className={cn("py-2 pr-4", r.failed ? "font-semibold text-red-700" : "text-muted-2")}>{r.failed}</td>
                  <td className="py-2 text-muted-2">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Suppressions({ suppressions, pending, act }: { suppressions: Suppression[] } & ActProps) {
  const [email, setEmail] = useState("")
  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <h2 className="font-semibold text-heading">Unsubscribed and suppressed</h2>
      <p className="mt-1 text-sm text-muted-2">These addresses are skipped by engagement emails. Account emails still send.</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          act(async () => {
            const r = await addSuppression(email)
            if (r.ok) setEmail("")
            return r
          })
        }}
      >
        <label htmlFor="suppress-email" className="sr-only">
          Email to suppress
        </label>
        <input
          id="suppress-email"
          type="email"
          required
          placeholder="name@company.com"
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className={btnSecondary} disabled={pending}>
          Suppress
        </button>
      </form>
      {suppressions.length ? (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {suppressions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-heading">{s.email}</span>
              <span className="text-xs text-muted-2">
                {s.topic === "all" ? "All engagement" : s.topic} {" · "} {s.source} {" · "} {fmt(s.createdAt)}
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-green hover:underline disabled:opacity-50"
                disabled={pending}
                onClick={() => act(() => removeSuppression(s.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

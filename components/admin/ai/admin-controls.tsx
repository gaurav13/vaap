"use client"

import { useState, useTransition } from "react"
import { reviewKnowledgeSource, setEmergencyShutdown, updateAiSettings, type ActionResult } from "@/app/actions/ai-admin"
import { ASSISTANT_LANGUAGES, MODEL_CATALOG, MODEL_IDS, type AiSettings, type AssistantModelId } from "@/lib/ai-assistant/config"
import { cn } from "@/lib/utils"

const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-heading"
const btn = "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-50"
const primary = cn(btn, "bg-green text-primary-foreground hover:bg-green-hover")
const secondary = cn(btn, "border border-border text-heading hover:bg-muted")
const danger = cn(btn, "border border-destructive/30 text-destructive hover:bg-destructive/10")

const LANGUAGE_LABELS: Record<string, string> = { en: "English", ur: "Urdu", "roman-ur": "Roman Urdu" }

function Result({ state }: { state: ActionResult | null }) {
  if (!state) return null
  return (
    <p role="status" className={cn("text-sm", state.ok ? "text-green" : "text-destructive")}>
      {state.ok ? state.message : state.error}
    </p>
  )
}

export function KnowledgeReviewButtons({ id, title }: { id: number; title: string }) {
  const [pending, start] = useTransition()
  const [state, setState] = useState<ActionResult | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} className={primary} onClick={() => start(async () => setState(await reviewKnowledgeSource(id, "approved")))}>
        Approve
        <span className="sr-only"> {title}</span>
      </button>
      <button type="button" disabled={pending} className={danger} onClick={() => start(async () => setState(await reviewKnowledgeSource(id, "rejected")))}>
        Reject
        <span className="sr-only"> {title}</span>
      </button>
      <Result state={state} />
    </div>
  )
}

export function EmergencySwitch({ on }: { on: boolean }) {
  const [pending, start] = useTransition()
  const [state, setState] = useState<ActionResult | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        className={on ? primary : danger}
        onClick={() => {
          const msg = on
            ? "Turn paid AI back on? The assistant will start spending again."
            : "Stop all paid AI requests now? The assistant falls back to free answers until you turn it back on."
          if (confirm(msg)) start(async () => setState(await setEmergencyShutdown(!on)))
        }}
      >
        {on ? "End emergency shutdown" : "Emergency shutdown"}
      </button>
      <Result state={state} />
    </div>
  )
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string
  hint?: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-heading">{label}</span>
      <input type="number" className={field} value={value} min={min} step={step} onChange={(e) => onChange(Number(e.target.value))} />
      {hint ? <span className="text-xs leading-relaxed text-muted-2">{hint}</span> : null}
    </label>
  )
}

export function SettingsForm({ initial }: { initial: AiSettings }) {
  const [s, setS] = useState<AiSettings>(initial)
  const [thresholds, setThresholds] = useState(initial.alertThresholds.join(", "))
  const [pending, start] = useTransition()
  const [state, setState] = useState<ActionResult | null>(null)
  const set = <K extends keyof AiSettings>(k: K, v: AiSettings[K]) => setS((p) => ({ ...p, [k]: v }))

  const toggleModel = (m: AssistantModelId) => {
    const has = s.approvedModels.includes(m)
    const approvedModels = has ? s.approvedModels.filter((x) => x !== m) : [...s.approvedModels, m]
    setS((p) => ({
      ...p,
      approvedModels,
      fallbackModel: p.fallbackModel && !approvedModels.includes(p.fallbackModel) ? null : p.fallbackModel,
    }))
  }

  const save = () => {
    const alertThresholds = thresholds
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0 && n <= 100)
    start(async () => setState(await updateAiSettings({ ...s, alertThresholds })))
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-serif text-base font-bold text-heading">Assistant</legend>
        <label className="flex items-center gap-2 text-sm text-heading">
          <input type="checkbox" checked={s.enabled} onChange={(e) => set("enabled", e.target.checked)} className="size-4 accent-[var(--green)]" />
          Paid AI answers enabled
        </label>
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-heading">Languages</span>
          <div className="flex flex-wrap gap-4">
            {ASSISTANT_LANGUAGES.map((l) => (
              <label key={l} className="flex items-center gap-2 text-heading">
                <input
                  type="checkbox"
                  checked={s.languages.includes(l)}
                  onChange={(e) => set("languages", e.target.checked ? [...s.languages, l] : s.languages.filter((x) => x !== l))}
                  className="size-4 accent-[var(--green)]"
                />
                {LANGUAGE_LABELS[l]}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-serif text-base font-bold text-heading">Models</legend>
        <p className="text-sm leading-relaxed text-muted-2">Only approved models can be used. Prices are USD per 1M tokens (input / output).</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {MODEL_IDS.map((m) => {
            const info = MODEL_CATALOG[m]
            return (
              <li key={m}>
                <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                  <input type="checkbox" checked={s.approvedModels.includes(m)} onChange={() => toggleModel(m)} className="mt-0.5 size-4 accent-[var(--green)]" />
                  <span className="flex flex-col">
                    <span className="font-medium text-heading">{info.label}</span>
                    <span className="text-xs text-muted-2">
                      {info.provider} · ${info.input} / ${info.output}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-heading">Default model</span>
            <select className={field} value={s.defaultModel} onChange={(e) => set("defaultModel", e.target.value as AssistantModelId)}>
              {s.approvedModels.map((m) => (
                <option key={m} value={m}>
                  {MODEL_CATALOG[m].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-heading">Fallback model</span>
            <select
              className={field}
              value={s.fallbackModel ?? ""}
              onChange={(e) => set("fallbackModel", (e.target.value || null) as AssistantModelId | null)}
            >
              <option value="">None</option>
              {s.approvedModels
                .filter((m) => m !== s.defaultModel)
                .map((m) => (
                  <option key={m} value={m}>
                    {MODEL_CATALOG[m].label}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-2 font-serif text-base font-bold text-heading">Budget</legend>
        <NumberField label="Monthly budget (USD)" value={s.monthlyBudgetUsd} step={0.5} onChange={(v) => set("monthlyBudgetUsd", v)} />
        <NumberField label="Daily budget (USD)" value={s.dailyBudgetUsd} step={0.1} onChange={(v) => set("dailyBudgetUsd", v)} />
        <NumberField
          label="Max cost per request (USD)"
          hint="Requests whose worst case exceeds this are refused."
          value={s.maxCostPerRequestUsd}
          step={0.001}
          min={0.001}
          onChange={(v) => set("maxCostPerRequestUsd", v)}
        />
        <NumberField label="Max answer length (tokens)" value={s.maxOutputTokens} min={100} step={50} onChange={(v) => set("maxOutputTokens", v)} />
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-heading">Alert thresholds (% of budget)</span>
          <input className={field} value={thresholds} onChange={(e) => setThresholds(e.target.value)} placeholder="50, 75, 90, 100" />
          <span className="text-xs leading-relaxed text-muted-2">Super Admins are emailed once per period when spend crosses each threshold.</span>
        </label>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 font-serif text-base font-bold text-heading">Usage limits</legend>
        <NumberField label="Guest requests per day" value={s.guestDailyRequests} onChange={(v) => set("guestDailyRequests", v)} />
        <NumberField label="Member requests per day" value={s.userDailyRequests} onChange={(v) => set("userDailyRequests", v)} />
        <NumberField label="Member requests per month" value={s.userMonthlyRequests} onChange={(v) => set("userMonthlyRequests", v)} />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-serif text-base font-bold text-heading">Quick actions</legend>
        <div className="flex flex-wrap gap-4">
          {s.quickActions.map((q) => (
            <label key={q.key} className="flex items-center gap-2 text-sm capitalize text-heading">
              <input
                type="checkbox"
                checked={q.enabled}
                onChange={(e) =>
                  set(
                    "quickActions",
                    s.quickActions.map((x) => (x.key === q.key ? { ...x, enabled: e.target.checked } : x)),
                  )
                }
                className="size-4 accent-[var(--green)]"
              />
              {q.key}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-serif text-base font-bold text-heading">Welcome message</legend>
        {ASSISTANT_LANGUAGES.map((l) => (
          <label key={l} className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-heading">{LANGUAGE_LABELS[l]}</span>
            <textarea
              rows={2}
              maxLength={600}
              dir={l === "ur" ? "rtl" : undefined}
              className={cn(field, "leading-relaxed")}
              value={s.welcome[l]}
              placeholder="Leave empty to use the default greeting"
              onChange={(e) => set("welcome", { ...s.welcome, [l]: e.target.value })}
            />
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        <button type="button" disabled={pending} className={secondary} onClick={() => setS(initial)}>
          Reset
        </button>
        <Result state={state} />
      </div>
    </form>
  )
}

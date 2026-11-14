"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Pause, Pencil, Play, Plus, Power, Tag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { savePromotion, setPromotionStatus, type PromotionInput } from "@/app/actions/promotions"
import {
  computeDiscount,
  discountLabel,
  effectiveStatus,
  formatInZone,
  formatPKR,
  MAX_PERCENT_DISCOUNT,
  PROMOTION_TIME_ZONES,
  STATUS_LABELS,
  utcToZonedLocal,
  type DiscountType,
  type PromotionStatus,
} from "@/lib/promotions-shared"

export type AdminPromotion = {
  id: number
  name: string
  description: string
  planIds: number[]
  discountType: DiscountType
  discountValue: number
  startsAt: string
  endsAt: string
  timeZone: string
  status: string
  showCountdown: boolean
  showBadge: boolean
}

type PlanOption = { id: number; title: string; basePkr: number }

const STATUS_STYLES: Record<PromotionStatus, string> = {
  draft: "bg-muted text-muted-2",
  scheduled: "bg-gold/15 text-gold",
  active: "bg-green text-primary-foreground",
  expired: "bg-muted text-muted-2 line-through",
  paused: "border border-line bg-background text-muted-2",
}

const DEFAULT_ZONE = "Asia/Karachi"

function emptyForm(): PromotionInput {
  const start = new Date(Date.now() + 60 * 60 * 1000)
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  return {
    name: "",
    description: "",
    planIds: [],
    discountType: "percent",
    discountValue: 20,
    startsLocal: utcToZonedLocal(start, DEFAULT_ZONE),
    endsLocal: utcToZonedLocal(end, DEFAULT_ZONE),
    timeZone: DEFAULT_ZONE,
    showCountdown: true,
    showBadge: true,
  }
}

function toForm(p: AdminPromotion): PromotionInput {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    planIds: p.planIds,
    discountType: p.discountType,
    discountValue: p.discountValue,
    startsLocal: utcToZonedLocal(p.startsAt, p.timeZone),
    endsLocal: utcToZonedLocal(p.endsAt, p.timeZone),
    timeZone: p.timeZone,
    showCountdown: p.showCountdown,
    showBadge: p.showBadge,
  }
}

export function PromotionManager({ promotions, plans }: { promotions: AdminPromotion[]; plans: PlanOption[] }) {
  const router = useRouter()
  const [form, setForm] = useState<PromotionInput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const planTitle = (id: number) => plans.find((p) => p.id === id)?.title ?? `Plan #${id}`

  function run(task: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await task()
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.")
        return
      }
      setNotice(success)
      setForm(null)
      router.refresh()
    })
  }

  function confirmDeactivate(p: AdminPromotion) {
    if (!window.confirm(`End "${p.name}" now? Standard pricing returns immediately and it cannot be resumed.`)) return
    run(() => setPromotionStatus(p.id, "deactivate"), "Promotion deactivated.")
  }

  return (
    <div className="flex flex-col gap-6">
      <div aria-live="polite" className="flex flex-col gap-2">
        {notice && <p className="rounded-lg bg-green/10 px-4 py-2 text-sm font-medium text-green">{notice}</p>}
        {error && !form && <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">{error}</p>}
      </div>

      {form ? (
        <PromotionForm
          form={form}
          plans={plans}
          pending={pending}
          error={error}
          onChange={setForm}
          onCancel={() => {
            setForm(null)
            setError(null)
          }}
          onSave={(mode) =>
            run(() => savePromotion(form, mode), mode === "publish" ? "Promotion published." : "Draft saved.")
          }
        />
      ) : (
        <div>
          <Button onClick={() => setForm(emptyForm())}>
            <Plus aria-hidden />
            New promotion
          </Button>
        </div>
      )}

      {promotions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-background p-10 text-center">
          <Tag className="mx-auto size-6 text-muted-2" aria-hidden />
          <p className="mt-3 font-semibold text-heading">No promotions yet</p>
          <p className="mt-1 text-sm text-muted-2">Create one to offer a limited-time discount on membership plans.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {promotions.map((p) => {
            const status = effectiveStatus(p)
            const canEdit = status !== "expired"
            return (
              <li key={p.id} className="flex flex-col gap-4 rounded-xl border border-line bg-background p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-heading">{p.name}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                      {discountLabel(p.discountType, p.discountValue)}
                    </span>
                  </div>
                  {p.description && <p className="mt-1 text-sm leading-relaxed text-muted-2">{p.description}</p>}
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-body">
                    <CalendarClock className="size-4 text-muted-2" aria-hidden />
                    {formatInZone(p.startsAt, p.timeZone)} to {formatInZone(p.endsAt, p.timeZone)}
                  </p>
                  <p className="mt-1 text-sm text-muted-2">Plans: {p.planIds.map(planTitle).join(", ")}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {canEdit && (
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => setForm(toForm(p))}>
                      <Pencil aria-hidden />
                      Edit
                    </Button>
                  )}
                  {(status === "active" || status === "scheduled") && (
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setPromotionStatus(p.id, "pause"), "Promotion paused.")}>
                      <Pause aria-hidden />
                      Pause
                    </Button>
                  )}
                  {status === "paused" && (
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setPromotionStatus(p.id, "resume"), "Promotion resumed.")}>
                      <Play aria-hidden />
                      Resume
                    </Button>
                  )}
                  {status !== "expired" && status !== "draft" && (
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => confirmDeactivate(p)}>
                      <Power aria-hidden />
                      Deactivate
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PromotionForm({
  form,
  plans,
  pending,
  error,
  onChange,
  onCancel,
  onSave,
}: {
  form: PromotionInput
  plans: PlanOption[]
  pending: boolean
  error: string | null
  onChange: (next: PromotionInput) => void
  onCancel: () => void
  onSave: (mode: "draft" | "publish") => void
}) {
  const set = <K extends keyof PromotionInput>(key: K, value: PromotionInput[K]) => onChange({ ...form, [key]: value })

  const preview = useMemo(
    () =>
      plans
        .filter((p) => form.planIds.includes(p.id))
        .map((p) => {
          const discount = computeDiscount(p.basePkr, form.discountType, Number(form.discountValue) || 0)
          return { ...p, discount, final: p.basePkr - discount }
        }),
    [plans, form.planIds, form.discountType, form.discountValue],
  )

  function togglePlan(id: number, checked: boolean) {
    set("planIds", checked ? [...form.planIds, id] : form.planIds.filter((p) => p !== id))
  }

  return (
    <form
      className="flex flex-col gap-6 rounded-xl border border-line bg-background p-6"
      onSubmit={(e) => {
        e.preventDefault()
        onSave("publish")
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-lg font-bold text-heading">{form.id ? "Edit promotion" : "New promotion"}</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Close form">
          <X aria-hidden />
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="promo-name">Promotion name</Label>
          <Input id="promo-name" value={form.name} maxLength={120} required placeholder="Launch Week Offer" onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="promo-description">Description (optional, shown to visitors)</Label>
          <Textarea id="promo-description" value={form.description} maxLength={500} rows={2} onChange={(e) => set("description", e.target.value)} />
        </div>

        <fieldset className="flex flex-col gap-3 md:col-span-2">
          <legend className="mb-2 text-sm font-medium text-heading">Applies to</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {plans.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm text-body has-[[data-state=checked]]:border-green">
                <Checkbox checked={form.planIds.includes(p.id)} onCheckedChange={(v) => togglePlan(p.id, v === true)} />
                <span className="flex-1">{p.title}</span>
                <span className="text-xs text-muted-2">{p.basePkr > 0 ? formatPKR(p.basePkr) : "No fee"}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor="promo-type">Discount type</Label>
          <select
            id="promo-type"
            value={form.discountType}
            onChange={(e) => set("discountType", e.target.value as DiscountType)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-heading"
          >
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed amount (PKR)</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="promo-value">{form.discountType === "percent" ? "Discount percentage" : "Discount amount (PKR)"}</Label>
          <Input
            id="promo-value"
            type="number"
            min={1}
            max={form.discountType === "percent" ? MAX_PERCENT_DISCOUNT : undefined}
            required
            value={form.discountValue}
            onChange={(e) => set("discountValue", Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="promo-start">Starts</Label>
          <Input id="promo-start" type="datetime-local" required value={form.startsLocal} onChange={(e) => set("startsLocal", e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="promo-end">Ends</Label>
          <Input id="promo-end" type="datetime-local" required value={form.endsLocal} onChange={(e) => set("endsLocal", e.target.value)} />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="promo-zone">Time zone</Label>
          <select
            id="promo-zone"
            value={form.timeZone}
            onChange={(e) => set("timeZone", e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-heading"
          >
            {PROMOTION_TIME_ZONES.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 md:col-span-2">
          <label className="flex items-center gap-3 text-sm text-body">
            <Checkbox checked={form.showBadge} onCheckedChange={(v) => set("showBadge", v === true)} />
            Show the discount badge on membership cards
          </label>
          <label className="flex items-center gap-3 text-sm text-body">
            <Checkbox checked={form.showCountdown} onCheckedChange={(v) => set("showCountdown", v === true)} />
            Show a countdown timer until the offer ends
          </label>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="rounded-lg bg-muted/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-2">Price preview</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {preview.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-heading">{p.title}</span>
                <span className="text-body">
                  <s className="text-muted-2">{formatPKR(p.basePkr)}</s> <strong className="text-green">{formatPKR(p.final)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" variant="outline" onClick={() => onSave("draft")} disabled={pending}>
          Save as draft
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Publish"}
        </Button>
      </div>
    </form>
  )
}

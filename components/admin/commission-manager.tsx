"use client"

import { useMemo, useState, useTransition } from "react"
import { Pencil, Percent, Plus, Trash2, Coins, Users } from "lucide-react"
import {
  saveCommissionRule,
  setCommissionRuleStatus,
  deleteCommissionRule,
  type CommissionRuleInput,
} from "@/app/actions/admin-referrals"
import { cn } from "@/lib/utils"

type Rule = {
  id: number
  name: string
  referrerRole: string
  membershipCategory: string
  rewardType: string
  commissionPercent: string
  fixedAmount: number
  currency: string
  commissionableFees: string
  status: string
  createdAt: string | Date
  updatedAt: string | Date
}

const ROLE_OPTIONS = [
  { value: "", label: "All staff who bring a member (overall)" },
  { value: "staff", label: "Staff" },
  { value: "committee_head", label: "Committee Head" },
  { value: "committee_member", label: "Committee Member" },
  { value: "kol", label: "KOL / Influencer" },
  { value: "admin", label: "Super Admin" },
]

const FEE_OPTIONS = [
  { value: "admission", label: "Admission fee" },
  { value: "annual", label: "Annual fee" },
  { value: "renewal", label: "Renewal fee" },
]

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green/15 text-green",
  draft: "bg-muted text-muted-foreground",
  paused: "bg-amber-100 text-amber-800",
  archived: "bg-destructive/10 text-destructive",
}

const roleLabel = (v: string) => ROLE_OPTIONS.find((r) => r.value === v)?.label ?? "Any team member"
const money = (n: number, ccy = "PKR") => `${ccy} ${Number(n || 0).toLocaleString("en-PK")}`

function rewardLabel(r: Rule) {
  if (r.rewardType === "percentage") return `${Number.parseFloat(r.commissionPercent || "0")}%`
  if (r.rewardType === "fixed") return money(r.fixedAmount, r.currency)
  return "No reward"
}

const EMPTY: CommissionRuleInput = {
  name: "",
  referrerRole: "",
  membershipCategory: "",
  rewardType: "percentage",
  commissionPercent: "10",
  fixedAmount: 0,
  currency: "PKR",
  commissionableFees: ["annual"],
  status: "active",
}

// Overall commission = a catch-all rule (no role, no category) that applies to
// every staff member who brings a member, unless a more specific rule matches.
const EMPTY_OVERALL: CommissionRuleInput = {
  ...EMPTY,
  name: "Overall commission (all staff)",
}

const isOverall = (r: { referrerRole: string; membershipCategory: string }) =>
  !r.referrerRole && !r.membershipCategory

export function CommissionManager({ rules: initial }: { rules: Rule[] }) {
  const [rules, setRules] = useState<Rule[]>(initial)
  const [editing, setEditing] = useState<CommissionRuleInput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const activeCount = useMemo(() => rules.filter((r) => r.status === "active").length, [rules])
  const topPercent = useMemo(
    () =>
      rules
        .filter((r) => r.rewardType === "percentage")
        .reduce((max, r) => Math.max(max, Number.parseFloat(r.commissionPercent || "0")), 0),
    [rules],
  )

  function refresh() {
    startTransition(async () => {
      // Server actions revalidate; a soft reload keeps local state in sync.
      const { getCommissionRules } = await import("@/app/actions/admin-referrals")
      const fresh = (await getCommissionRules()) as Rule[]
      setRules(fresh)
    })
  }

  function toStatus(id: number, status: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    startTransition(async () => {
      const res = await setCommissionRuleStatus(id, status)
      if (!res.ok) {
        setError(res.error ?? "Could not update status.")
        refresh()
      }
    })
  }

  function remove(id: number) {
    if (!window.confirm("Delete this commission rule? Rewards already created keep their rate.")) return
    setRules((prev) => prev.filter((r) => r.id !== id))
    startTransition(async () => {
      const res = await deleteCommissionRule(id)
      if (!res.ok) {
        setError(res.error ?? "Could not delete rule.")
        refresh()
      }
    })
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commission &amp; Rewards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Allocate commission to staff and team, set or change the percentage, and control which fees it applies to.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null)
              setEditing({ ...EMPTY_OVERALL })
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-green px-4 py-2.5 text-sm font-semibold text-green transition-colors hover:bg-green/10"
          >
            <Users className="size-4" /> Set overall commission
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setEditing({ ...EMPTY })
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green/90"
          >
            <Plus className="size-4" /> New commission
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={Coins} label="Total rules" value={String(rules.length)} tone="sky" />
        <Stat icon={Users} label="Active" value={String(activeCount)} tone="green" />
        <Stat icon={Percent} label="Top rate" value={topPercent > 0 ? `${topPercent}%` : "—"} tone="amber" />
      </section>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Commission</th>
                <th className="px-5 py-3 font-semibold">Applies to</th>
                <th className="px-5 py-3 font-semibold">Rate</th>
                <th className="px-5 py-3 font-semibold">Fees</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No commission rules yet. Create one to start allocating rewards to your team.
                  </td>
                </tr>
              )}
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{r.name}</p>
                      {isOverall(r) && (
                        <span className="rounded-full bg-green/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green">
                          Overall
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.membershipCategory ? r.membershipCategory : "All membership categories"}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-foreground">
                    {isOverall(r) ? "All staff who bring a member" : roleLabel(r.referrerRole)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-semibold text-foreground">{rewardLabel(r)}</span>
                    <p className="text-xs capitalize text-muted-foreground">{r.rewardType}</p>
                  </td>
                  <td className="px-5 py-3 text-xs capitalize text-muted-foreground">
                    {r.commissionableFees.split(",").filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={r.status}
                      disabled={pending}
                      onChange={(e) => toStatus(r.id, e.target.value)}
                      className={cn(
                        "cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-semibold capitalize outline-none",
                        STATUS_STYLES[r.status] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      <option value="active">active</option>
                      <option value="draft">draft</option>
                      <option value="paused">paused</option>
                      <option value="archived">archived</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null)
                          setEditing({
                            id: r.id,
                            name: r.name,
                            referrerRole: r.referrerRole,
                            membershipCategory: r.membershipCategory,
                            rewardType: r.rewardType,
                            commissionPercent: r.commissionPercent,
                            fixedAmount: r.fixedAmount,
                            currency: r.currency,
                            commissionableFees: r.commissionableFees.split(",").filter(Boolean),
                            status: r.status,
                          })
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-mint"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <RuleEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function RuleEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: CommissionRuleInput
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<CommissionRuleInput>(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function set<K extends keyof CommissionRuleInput>(key: K, value: CommissionRuleInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleFee(fee: string) {
    setForm((f) => ({
      ...f,
      commissionableFees: f.commissionableFees.includes(fee)
        ? f.commissionableFees.filter((x) => x !== fee)
        : [...f.commissionableFees, fee],
    }))
  }

  // Live preview against a sample eligible amount so the admin sees the payout.
  const sample = 30000
  const preview =
    form.rewardType === "percentage"
      ? Math.round((sample * (Number.parseFloat(form.commissionPercent || "0") || 0)) / 100)
      : form.rewardType === "fixed"
        ? Math.round(form.fixedAmount || 0)
        : 0

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await saveCommissionRule(form)
      if (res.ok) onSaved()
      else setError(res.error ?? "Could not save commission.")
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={form.id ? "Edit commission rule" : "New commission rule"}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-foreground">
          {form.id ? "Edit commission" : "New commission"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set who earns the commission, the percentage, and which fees it applies to.
        </p>

        <div className="mt-5 grid gap-4">
          <Field label="Name">
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Staff standard commission"
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-green focus:ring-2 focus:ring-green/20"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Allocate to">
              <select
                value={form.referrerRole}
                onChange={(e) => set("referrerRole", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-green focus:ring-2 focus:ring-green/20"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Membership category">
              <input
                value={form.membershipCategory}
                onChange={(e) => set("membershipCategory", e.target.value)}
                placeholder="Any category"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-green focus:ring-2 focus:ring-green/20"
              />
            </Field>
          </div>

          <Field label="Reward type">
            <div className="grid grid-cols-3 gap-2">
              {(["percentage", "fixed", "none"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("rewardType", t)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition-colors",
                    form.rewardType === t
                      ? "border-green bg-green/10 text-green"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          {form.rewardType === "percentage" && (
            <Field label="Commission percent">
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={form.commissionPercent}
                  onChange={(e) => set("commissionPercent", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-9 text-sm text-foreground outline-none focus:border-green focus:ring-2 focus:ring-green/20"
                />
                <Percent className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </Field>
          )}

          {form.rewardType === "fixed" && (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field label="Fixed amount">
                <input
                  type="number"
                  min={0}
                  value={form.fixedAmount}
                  onChange={(e) => set("fixedAmount", Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-green focus:ring-2 focus:ring-green/20"
                />
              </Field>
              <Field label="Currency">
                <input
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}
                  className="w-24 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-green focus:ring-2 focus:ring-green/20"
                />
              </Field>
            </div>
          )}

          {form.rewardType !== "none" && (
            <Field label="Commissionable fees">
              <div className="flex flex-wrap gap-2">
                {FEE_OPTIONS.map((f) => {
                  const on = form.commissionableFees.includes(f.value)
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => toggleFee(f.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        on
                          ? "border-green bg-green/10 text-green"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-green focus:ring-2 focus:ring-green/20"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </Field>

          {form.rewardType !== "none" && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                On a sample {money(sample, form.currency)} eligible amount
              </span>
              <span className="text-lg font-bold text-foreground">{money(preview, form.currency)}</span>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !form.name.trim()}
            onClick={submit}
            className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green/90 disabled:opacity-50"
          >
            {pending ? "Saving…" : form.id ? "Save changes" : "Create commission"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Coins
  label: string
  value: string
  tone: "amber" | "sky" | "green"
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50",
    sky: "border-sky-200 bg-sky-50",
    green: "border-green/20 bg-green/5",
  }
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border p-4", tones[tone])}>
      <span className="flex size-10 items-center justify-center rounded-lg bg-card">
        <Icon className="size-5 text-foreground" />
      </span>
      <div>
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

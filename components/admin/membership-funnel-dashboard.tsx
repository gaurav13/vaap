"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, Mail, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { sendMembershipInvitations } from "@/app/actions/membership-funnel"

type Registered = {
  id: string
  name: string
  email: string
  registeredAt: string
  emailVerified: boolean
  status: "not-subscribed" | "application-started" | "payment-pending"
  referralCode: string | null
  invitationsSent: number
  remindersSent: number
  lastInvitedAt: string | null
  suppressed: "unsubscribed" | "bounced" | null
}

type Paid = {
  id: number
  name: string
  email: string
  membershipId: string
  plan: string
  status: string
  paymentStatus: "paid-card" | "paid-crypto" | "not-required" | "recorded-manually"
  paymentMethod: string | null
  amount: string | null
  paymentDate: string | null
  activatedAt: string
  expiresAt: string | null
  referralCode: string | null
  certificate: "issued" | "revoked" | "not-issued"
  renewal: "current" | "due-soon" | "expired" | "renewal-pending" | "no-expiry"
}

type History = {
  id: number
  name: string
  email: string
  stage: string
  trigger: string
  status: string
  error: string | null
  actor: string | null
  createdAt: string
  converted: boolean
}

type Props = {
  stats: {
    totalRegistered: number
    activePaid: number
    unpaidRegistered: number
    pendingPayments: number
    expired: number
    invitationsSent: number
    failedInvitations: number
    conversions: number
  }
  funnel: { key: string; label: string; value: number }[]
  automation: { enabled: boolean; reminderDays: number[]; dailyLimit: number; lastRunAt: string | null }
  registered: Registered[]
  paid: Paid[]
  history: History[]
}

const TABS = [
  { key: "registered", label: "Registered Users" },
  { key: "paid", label: "Paid Members" },
  { key: "history", label: "Invitation History" },
] as const
type Tab = (typeof TABS)[number]["key"]

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const REG_STATUS: Record<Registered["status"], string> = {
  "not-subscribed": "Not Subscribed",
  "application-started": "Application started",
  "payment-pending": "Payment pending review",
}
const PAY_STATUS: Record<Paid["paymentStatus"], string> = {
  "paid-card": "Paid · Card",
  "paid-crypto": "Paid · Crypto",
  "not-required": "Not required (invite plan)",
  "recorded-manually": "Recorded manually",
}
const RENEWAL: Record<Paid["renewal"], string> = {
  current: "Current",
  "due-soon": "Due within 30 days",
  expired: "Expired",
  "renewal-pending": "Renewal pending",
  "no-expiry": "No expiry",
}
const STAGE: Record<string, string> = {
  invitation: "Invitation",
  "reminder-1": "Reminder 1",
  "reminder-2": "Reminder 2",
  "reminder-final": "Final reminder",
  "manual-reminder": "Manual reminder",
}

function downloadCsv(filename: string, header: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v)
    // Neutralise spreadsheet formula injection from user-supplied names.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
    return `"${safe.replace(/"/g, '""')}"`
  }
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function Badge({ tone, children }: { tone: "green" | "gold" | "red" | "muted"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold",
        tone === "green" && "bg-mint text-green",
        tone === "gold" && "bg-amber-50 text-amber-800",
        tone === "red" && "bg-red-50 text-red-700",
        tone === "muted" && "bg-muted/60 text-muted-2",
      )}
    >
      {children}
    </span>
  )
}

function Toolbar({
  query,
  setQuery,
  placeholder,
  children,
  onExport,
}: {
  query: string
  setQuery: (v: string) => void
  placeholder: string
  children?: React.ReactNode
  onExport: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative flex min-w-56 flex-1 items-center">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute left-3 size-4 text-muted-2" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm"
        />
      </label>
      {children}
      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-navy hover:bg-mint"
      >
        <Download className="size-4" aria-hidden />
        Export CSV
      </button>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line bg-card px-3 py-2 text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-2"
const td = "px-3 py-3 align-top text-sm text-heading"

export function MembershipFunnelDashboard({ stats, funnel, automation, registered, paid, history }: Props) {
  const [tab, setTab] = useState<Tab>("registered")
  const top = funnel[0]?.value || 1

  const cards = [
    { label: "Total registered users", value: stats.totalRegistered },
    { label: "Active paid members", value: stats.activePaid },
    { label: "Unpaid registered users", value: stats.unpaidRegistered },
    { label: "Pending membership payments", value: stats.pendingPayments },
    { label: "Expired memberships", value: stats.expired },
    { label: "Invitations sent", value: stats.invitationsSent },
    { label: "Membership conversions", value: stats.conversions },
  ]

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => (
          <div key={c.label} className="flex flex-col gap-1 rounded-xl border border-line bg-card p-4">
            <span className="text-2xl font-bold text-heading">{c.value.toLocaleString()}</span>
            <span className="text-xs leading-snug text-muted-2">{c.label}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-card p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 flex-col gap-3">
          <h2 className="font-serif text-lg font-bold text-heading">Conversion</h2>
          <ol className="flex flex-col gap-2 md:flex-row md:gap-3">
            {funnel.map((f, i) => (
              <li key={f.key} className="flex flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-muted-2">{f.label}</span>
                  <span className="font-semibold text-heading">{f.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-green"
                    style={{ width: `${Math.max(2, Math.round((f.value / top) * 100))}%`, opacity: 1 - i * 0.15 }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-4 text-sm lg:w-80">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-heading">Automated reminders</span>
            <Badge tone={automation.enabled ? "green" : "muted"}>{automation.enabled ? "On" : "Paused"}</Badge>
          </div>
          <p className="leading-relaxed text-muted-2">
            Invitation after registration, reminders on days {automation.reminderDays.join(", ")}. Up to{" "}
            {automation.dailyLimit} emails per day. Stops automatically once membership is active.
          </p>
          {stats.failedInvitations > 0 ? (
            <p className="font-semibold text-red-700">{stats.failedInvitations} invitation(s) failed to deliver.</p>
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/admin/emails/automations" className="font-semibold text-green hover:underline">
              Configure reminders
            </Link>
            <Link href={`/admin/emails/${encodeURIComponent("automation.membership-invitation")}`} className="font-semibold text-green hover:underline">
              Edit template
            </Link>
            <Link href="/admin/emails/logs" className="font-semibold text-green hover:underline">
              Delivery logs
            </Link>
          </div>
        </div>
      </section>

      <div role="tablist" aria-label="Sections" className="flex gap-1 border-b border-line">
        {TABS.map((t) => {
          const count = t.key === "registered" ? registered.length : t.key === "paid" ? paid.length : history.length
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
                tab === t.key ? "border-green text-green" : "border-transparent text-muted-2 hover:text-heading",
              )}
            >
              {t.label} <span className="font-normal">({count})</span>
            </button>
          )
        })}
      </div>

      {tab === "registered" ? <RegisteredTable rows={registered} /> : null}
      {tab === "paid" ? <PaidTable rows={paid} /> : null}
      {tab === "history" ? <HistoryTable rows={history} /> : null}
    </div>
  )
}

function RegisteredTable({ rows }: { rows: Registered[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [invited, setInvited] = useState("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (q && !`${r.name} ${r.email} ${r.referralCode ?? ""}`.toLowerCase().includes(q)) return false
      if (status !== "all" && r.status !== status) return false
      if (invited === "never" && r.invitationsSent > 0) return false
      if (invited === "invited" && r.invitationsSent === 0) return false
      if (invited === "suppressed" && !r.suppressed) return false
      return true
    })
  }, [rows, query, status, invited])

  const selectable = (r: Registered) => !r.suppressed && r.status !== "payment-pending"
  const visibleSelectable = filtered.filter(selectable)
  const allChecked = visibleSelectable.length > 0 && visibleSelectable.every((r) => selected.has(r.id))

  function toggleAll() {
    const next = new Set(selected)
    for (const r of visibleSelectable) allChecked ? next.delete(r.id) : next.add(r.id)
    setSelected(next)
  }

  function send(ids: string[]) {
    setMessage(null)
    startTransition(async () => {
      const res = await sendMembershipInvitations(ids)
      setMessage({ ok: res.ok, text: res.message })
      if (res.ok) {
        setSelected(new Set())
        router.refresh()
      }
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search name, email or referral code"
        onExport={() =>
          downloadCsv(
            "vaap-registered-users.csv",
            ["Name", "Email", "Registered", "Email verified", "Membership status", "Referral code", "Last invitation", "Invitations sent", "Reminders sent", "Suppressed"],
            filtered.map((r) => [
              r.name,
              r.email,
              fmtDate(r.registeredAt),
              r.emailVerified ? "Yes" : "No",
              REG_STATUS[r.status],
              r.referralCode,
              fmtDate(r.lastInvitedAt),
              r.invitationsSent,
              r.remindersSent,
              r.suppressed,
            ]),
          )
        }
      >
        <Select
          label="Membership status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            { value: "not-subscribed", label: "Not Subscribed" },
            { value: "application-started", label: "Application started" },
            { value: "payment-pending", label: "Payment pending" },
          ]}
        />
        <Select
          label="Invitation status"
          value={invited}
          onChange={setInvited}
          options={[
            { value: "all", label: "All invitations" },
            { value: "never", label: "Never invited" },
            { value: "invited", label: "Invited" },
            { value: "suppressed", label: "Unsubscribed / bounced" },
          ]}
        />
      </Toolbar>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-4 py-3 text-sm">
        <span className="text-muted-2">
          {selected.size ? `${selected.size} selected` : "Select users to send a membership invitation."}
        </span>
        <button
          type="button"
          disabled={!selected.size || pending}
          onClick={() => send([...selected])}
          className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="size-4" aria-hidden />
          {pending ? "Sending…" : `Send invitation${selected.size > 1 ? "s" : ""}`}
        </button>
      </div>
      {message ? (
        <p role="status" className={cn("text-sm font-semibold", message.ok ? "text-green" : "text-red-700")}>
          {message.text}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[960px]">
          <thead className="border-b border-line">
            <tr>
              <th className={th}>
                <input type="checkbox" aria-label="Select all visible users" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className={th}>User</th>
              <th className={th}>Registered</th>
              <th className={th}>Account</th>
              <th className={th}>Membership</th>
              <th className={th}>Referral</th>
              <th className={th}>Last invitation</th>
              <th className={th}>Reminders</th>
              <th className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className={td}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.name}`}
                    disabled={!selectable(r)}
                    checked={selected.has(r.id)}
                    onChange={() => {
                      const next = new Set(selected)
                      next.has(r.id) ? next.delete(r.id) : next.add(r.id)
                      setSelected(next)
                    }}
                  />
                </td>
                <td className={td}>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-muted-2">{r.email}</div>
                </td>
                <td className={td}>{fmtDate(r.registeredAt)}</td>
                <td className={td}>
                  {r.suppressed ? (
                    <Badge tone="red">{r.suppressed === "bounced" ? "Bounced" : "Unsubscribed"}</Badge>
                  ) : r.emailVerified ? (
                    <Badge tone="green">Verified</Badge>
                  ) : (
                    <Badge tone="muted">Email unverified</Badge>
                  )}
                </td>
                <td className={td}>
                  <Badge tone={r.status === "payment-pending" ? "gold" : "muted"}>{REG_STATUS[r.status]}</Badge>
                </td>
                <td className={cn(td, "font-mono text-xs")}>{r.referralCode ?? "—"}</td>
                <td className={td}>{fmtDate(r.lastInvitedAt)}</td>
                <td className={td}>{r.remindersSent}</td>
                <td className={td}>
                  <button
                    type="button"
                    disabled={!selectable(r) || pending}
                    onClick={() => send([r.id])}
                    className="whitespace-nowrap rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:bg-mint disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {r.invitationsSent ? "Send reminder" : "Send invitation"}
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-2">
                  No registered users match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PaidTable({ rows }: { rows: Paid[] }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const plans = useMemo(() => [...new Set(rows.map((r) => r.plan))].sort(), [rows])
  const [plan, setPlan] = useState("all")

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase()
    if (q && !`${r.name} ${r.email} ${r.membershipId} ${r.referralCode ?? ""}`.toLowerCase().includes(q)) return false
    if (status !== "all" && r.status !== status) return false
    if (plan !== "all" && r.plan !== plan) return false
    return true
  })

  return (
    <section className="flex flex-col gap-3">
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search name, email, membership ID or referral"
        onExport={() =>
          downloadCsv(
            "vaap-paid-members.csv",
            ["Name", "Email", "Membership ID", "Plan", "Status", "Payment", "Method", "Amount", "Payment date", "Activated", "Expires", "Referral", "Certificate", "Renewal"],
            filtered.map((r) => [
              r.name,
              r.email,
              r.membershipId,
              r.plan,
              r.status,
              PAY_STATUS[r.paymentStatus],
              r.paymentMethod,
              r.amount,
              fmtDate(r.paymentDate),
              fmtDate(r.activatedAt),
              fmtDate(r.expiresAt),
              r.referralCode,
              r.certificate,
              RENEWAL[r.renewal],
            ]),
          )
        }
      >
        <Select
          label="Member status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "expired", label: "Expired" },
            { value: "suspended", label: "Suspended" },
          ]}
        />
        <Select
          label="Plan"
          value={plan}
          onChange={setPlan}
          options={[{ value: "all", label: "All plans" }, ...plans.map((p) => ({ value: p, label: p }))]}
        />
      </Toolbar>

      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[1100px]">
          <thead className="border-b border-line">
            <tr>
              <th className={th}>Member</th>
              <th className={th}>Membership ID</th>
              <th className={th}>Plan</th>
              <th className={th}>Payment</th>
              <th className={th}>Paid on</th>
              <th className={th}>Activated</th>
              <th className={th}>Expires</th>
              <th className={th}>Referral</th>
              <th className={th}>Certificate</th>
              <th className={th}>Renewal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className={td}>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-muted-2">{r.email}</div>
                </td>
                <td className={cn(td, "font-mono text-xs")}>{r.membershipId}</td>
                <td className={td}>
                  <div>{r.plan}</div>
                  <Badge tone={r.status === "active" ? "green" : r.status === "expired" ? "red" : "muted"}>
                    {r.status}
                  </Badge>
                </td>
                <td className={td}>
                  <div>{PAY_STATUS[r.paymentStatus]}</div>
                  <div className="text-muted-2">{[r.amount, r.paymentMethod].filter(Boolean).join(" · ") || "—"}</div>
                </td>
                <td className={td}>{fmtDate(r.paymentDate)}</td>
                <td className={td}>{fmtDate(r.activatedAt)}</td>
                <td className={td}>{fmtDate(r.expiresAt)}</td>
                <td className={cn(td, "font-mono text-xs")}>{r.referralCode ?? "—"}</td>
                <td className={td}>
                  <Badge tone={r.certificate === "issued" ? "green" : r.certificate === "revoked" ? "red" : "muted"}>
                    {r.certificate === "not-issued" ? "Not issued" : r.certificate === "issued" ? "Issued" : "Revoked"}
                  </Badge>
                </td>
                <td className={td}>
                  <Badge
                    tone={r.renewal === "expired" ? "red" : r.renewal === "due-soon" || r.renewal === "renewal-pending" ? "gold" : "green"}
                  >
                    {RENEWAL[r.renewal]}
                  </Badge>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-sm text-muted-2">
                  No paid members match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function HistoryTable({ rows }: { rows: History[] }) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase()
    if (q && !`${r.name} ${r.email}`.toLowerCase().includes(q)) return false
    if (status === "converted") return r.converted
    if (status !== "all" && r.status !== status) return false
    return true
  })

  return (
    <section className="flex flex-col gap-3">
      <Toolbar
        query={query}
        setQuery={setQuery}
        placeholder="Search name or email"
        onExport={() =>
          downloadCsv(
            "vaap-invitation-history.csv",
            ["Sent", "Name", "Email", "Stage", "Trigger", "Status", "Error", "Sent by", "Converted"],
            filtered.map((r) => [
              new Date(r.createdAt).toISOString(),
              r.name,
              r.email,
              STAGE[r.stage] ?? r.stage,
              r.trigger,
              r.status,
              r.error,
              r.actor,
              r.converted ? "Yes" : "No",
            ]),
          )
        }
      >
        <Select
          label="Delivery status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All deliveries" },
            { value: "sent", label: "Sent" },
            { value: "failed", label: "Failed" },
            { value: "converted", label: "Converted to member" },
          ]}
        />
      </Toolbar>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-line">
            <tr>
              <th className={th}>Sent</th>
              <th className={th}>Recipient</th>
              <th className={th}>Stage</th>
              <th className={th}>Trigger</th>
              <th className={th}>Delivery</th>
              <th className={th}>Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className={cn(td, "whitespace-nowrap")}>{new Date(r.createdAt).toLocaleString("en-GB")}</td>
                <td className={td}>
                  <div className="font-semibold">{r.name || "—"}</div>
                  <div className="text-muted-2">{r.email}</div>
                </td>
                <td className={td}>{STAGE[r.stage] ?? r.stage}</td>
                <td className={td}>
                  <div className="capitalize">{r.trigger}</div>
                  {r.actor ? <div className="text-xs text-muted-2">{r.actor}</div> : null}
                </td>
                <td className={td}>
                  <Badge tone={r.status === "sent" ? "green" : "red"}>{r.status}</Badge>
                  {r.error ? <div className="mt-1 max-w-64 text-xs text-red-700">{r.error}</div> : null}
                </td>
                <td className={td}>{r.converted ? <Badge tone="green">Became member</Badge> : <span className="text-muted-2">—</span>}</td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-2">
                  No invitations sent yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

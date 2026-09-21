"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, ChevronDown, CreditCard, Mail, Phone, TriangleAlert, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { setApplicationStatus } from "@/app/actions/admin"

type Application = {
  id: number
  reference: string | null
  name: string
  email: string
  organization: string | null
  category: string
  message: string
  phone: string | null
  cnic: string | null
  registrationNumber: string | null
  website: string | null
  industrySector: string | null
  designation: string | null
  paymentMethod: string | null
  txid: string | null
  admissionFee: string | null
  annualFee: string | null
  totalAmount: string | null
  status: "pending" | "approved" | "rejected"
  completed: boolean
  createdAt: string
}

const FILTERS = ["all", "incomplete", "pending", "approved", "rejected"] as const

const FILTER_ACTIVE: Record<(typeof FILTERS)[number], string> = {
  all: "bg-navy text-white",
  incomplete: "bg-rose-600 text-white",
  pending: "bg-amber-500 text-white",
  approved: "bg-green text-white",
  rejected: "bg-destructive text-white",
}

export function ApplicationsManager({ items }: { items: Application[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all")
  const [expanded, setExpanded] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()

  function update(id: number, status: "pending" | "approved" | "rejected") {
    startTransition(async () => {
      await setApplicationStatus(id, status)
      router.refresh()
    })
  }

  const counts = {
    all: items.length,
    incomplete: items.filter((i) => !i.completed).length,
    pending: items.filter((i) => i.completed && i.status === "pending").length,
    approved: items.filter((i) => i.status === "approved").length,
    rejected: items.filter((i) => i.status === "rejected").length,
  }

  const visible =
    filter === "all"
      ? items
      : filter === "incomplete"
        ? items.filter((i) => !i.completed)
        : filter === "pending"
          ? items.filter((i) => i.completed && i.status === "pending")
          : items.filter((i) => i.status === filter)

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
              filter === f
                ? FILTER_ACTIVE[f]
                : "border border-line bg-card text-body hover:bg-mint",
            )}
          >
            {f === "incomplete" && <TriangleAlert className="size-3.5" />}
            {f}{" "}
            <span
              className={cn(
                "ml-0.5 rounded-full px-1.5 text-xs font-semibold tabular-nums",
                filter === f ? "bg-white/25" : "bg-muted text-muted-2",
              )}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4">
        {visible.length === 0 && (
          <p className="rounded-xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
            No applications{filter !== "all" ? ` with status "${filter}"` : ""}.
          </p>
        )}
        {visible.map((a) => {
          const isOpen = expanded === a.id
          return (
            <div key={a.id} className="rounded-xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-heading">{a.name}</h3>
                    {a.completed ? <StatusBadge status={a.status} /> : <IncompleteBadge />}
                    {a.reference && (
                      <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-2">
                        {a.reference}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-2">
                    <Mail className="size-3.5" /> {a.email}
                  </p>
                  {a.organization && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-2">
                      <Building2 className="size-3.5" /> {a.organization}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-md bg-mint px-2 py-0.5 text-[11px] font-semibold text-green">
                      {a.category}
                    </span>
                    {a.totalAmount && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[11px] font-semibold text-heading">
                        <CreditCard className="size-3" /> {a.totalAmount}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-2">
                  {new Date(a.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {!a.completed && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <TriangleAlert className="size-3.5" /> Stopped at the payment stage
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-rose-700">
                    This applicant saved their details but did not complete payment. Reach out to help them finish.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-rose-900">
                    <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Mail className="size-3.5" /> {a.email}
                    </a>
                    {a.phone && (
                      <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                        <Phone className="size-3.5" /> {a.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : a.id)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-green hover:underline"
              >
                {isOpen ? "Hide details" : "View full application"}
                <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} />
              </button>

              {isOpen && (
                <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
                  <DetailRow label="Designation" value={a.designation} />
                  <DetailRow label="Phone" value={a.phone} />
                  <DetailRow label="CNIC / NIC" value={a.cnic} />
                  <DetailRow label="Registration No." value={a.registrationNumber} />
                  <DetailRow label="Website" value={a.website} />
                  <DetailRow label="Industry Sector" value={a.industrySector} />
                  <DetailRow
                    label="Payment Method"
                    value={
                      a.paymentMethod === "card"
                        ? "Credit / Debit Card"
                        : a.paymentMethod === "crypto"
                          ? "Crypto Payment"
                          : a.paymentMethod
                    }
                  />
                  <DetailRow label="Transaction ID (TXID)" value={a.txid} />
                  <DetailRow label="Admission Fee" value={a.admissionFee} />
                  <DetailRow label="Annual Fee" value={a.annualFee} />
                  <DetailRow label="Total Amount" value={a.totalAmount} />
                </dl>
              )}

              {a.message && <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-body">{a.message}</p>}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={pending || a.status === "approved"}
                  onClick={() => update(a.id, "approved")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-40"
                >
                  <Check className="size-4" /> Approve
                </button>
                <button
                  type="button"
                  disabled={pending || a.status === "rejected"}
                  onClick={() => update(a.id, "rejected")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-body transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                >
                  <X className="size-4" /> Reject
                </button>
                {a.status !== "pending" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => update(a.id, "pending")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-body transition-colors hover:bg-mint"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5 last:border-0">
      <dt className="text-muted-2">{label}</dt>
      <dd className="text-right font-medium text-heading">{value}</dd>
    </div>
  )
}

function IncompleteBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-700 ring-1 ring-inset ring-rose-200">
      <TriangleAlert className="size-3" /> Incomplete
    </span>
  )
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green/15 text-green",
    rejected: "bg-destructive/10 text-destructive",
  }
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", styles[status])}>
      {status}
    </span>
  )
}

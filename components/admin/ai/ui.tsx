import Link from "next/link"
import type React from "react"
import { cn } from "@/lib/utils"
import { STATUS_LABELS } from "@/lib/ai-assistant/format"

export function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: "default" | "good" | "warn" | "bad"
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-2">{label}</dt>
      <dd
        className={cn(
          "text-2xl font-bold tabular-nums text-heading",
          tone === "good" && "text-green",
          tone === "warn" && "text-warning",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </dd>
      {hint ? <dd className="text-xs leading-relaxed text-muted-2">{hint}</dd> : null}
    </div>
  )
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</dl>
}

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const id = `s-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  return (
    <section aria-labelledby={id} className={cn("rounded-xl border border-border bg-card p-4 lg:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="font-serif text-lg font-bold text-heading">
            {title}
          </h2>
          {description ? <p className="text-pretty text-sm leading-relaxed text-muted-2">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border bg-muted px-4 py-6 text-center text-sm text-muted-2">{children}</p>
}

export function Table({ children, caption }: { children: React.ReactNode; caption?: string }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 lg:-mx-5 lg:px-5">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  )
}

export const Th = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <th scope="col" className={cn("border-b border-border px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-2", className)}>
    {children}
  </th>
)

export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cn("border-b border-border px-2 py-2.5 align-top text-heading", className)}>{children}</td>
)

const STATUS_TONE: Record<string, string> = {
  ok: "bg-accent text-green",
  approved: "bg-accent text-green",
  error: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
  pending: "bg-warning-bg text-warning",
  draft: "bg-muted text-muted-2",
  withdrawn: "bg-muted text-muted-2",
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_TONE[status] ?? "bg-warning-bg text-warning",
      )}
    >
      {label ?? STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
    </span>
  )
}

export function EstimateTag({ actual }: { actual: boolean }) {
  return (
    <span
      className={cn(
        "ml-1 rounded px-1 py-px text-[10px] font-semibold uppercase tracking-wide",
        actual ? "bg-accent text-green" : "bg-muted text-muted-2",
      )}
      title={actual ? "Reconciled with the AI Gateway bill" : "Estimated from token counts and list pricing"}
    >
      {actual ? "Actual" : "Est."}
    </span>
  )
}

export function Pager({ page, total, pageSize, href }: { page: number; total: number; pageSize: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-2">
        Page {page} of {pages} · {total} rows
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="rounded-md border border-border px-3 py-1.5 font-medium text-heading hover:bg-muted">
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className="rounded-md border border-border px-3 py-1.5 font-medium text-heading hover:bg-muted">
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  )
}

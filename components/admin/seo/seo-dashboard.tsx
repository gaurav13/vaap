"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, Pencil, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { CatalogItem } from "@/lib/seo/catalog"
import { SEO_KIND_LABELS, type SeoKind } from "@/lib/seo/shared"

type StatusFilter = "all" | "errors" | "warnings" | "healthy" | "custom"

const selectClass =
  "h-10 rounded-lg border border-line bg-card px-3 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"

export function SeoDashboard({ items }: { items: CatalogItem[] }) {
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState<SeoKind | "all">("all")
  const [status, setStatus] = useState<StatusFilter>("all")

  const kinds = useMemo(() => [...new Set(items.map((i) => i.kind))], [items])
  const counts = useMemo(
    () => ({
      total: items.length,
      errors: items.filter((i) => i.errors > 0).length,
      warnings: items.filter((i) => i.errors === 0 && i.warnings > 0).length,
      healthy: items.filter((i) => i.errors === 0 && i.warnings === 0).length,
    }),
    [items],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter((i) => kind === "all" || i.kind === kind)
      .filter((i) => {
        if (status === "errors") return i.errors > 0
        if (status === "warnings") return i.errors === 0 && i.warnings > 0
        if (status === "healthy") return i.errors === 0 && i.warnings === 0
        if (status === "custom") return i.overridden || i.draft
        return true
      })
      .filter((i) => !q || `${i.label} ${i.path} ${i.title}`.toLowerCase().includes(q))
      .sort((a, b) => b.errors - a.errors || b.warnings - a.warnings || a.label.localeCompare(b.label))
  }, [items, query, kind, status])

  return (
    <div className="mt-6 flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Indexed URLs", value: counts.total, filter: "all" as const },
          { label: "With errors", value: counts.errors, filter: "errors" as const },
          { label: "Warnings only", value: counts.warnings, filter: "warnings" as const },
          { label: "Healthy", value: counts.healthy, filter: "healthy" as const },
        ].map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setStatus(c.filter)}
            aria-pressed={status === c.filter}
            className="flex flex-col gap-1 rounded-xl border border-line bg-card p-4 text-left transition-colors hover:border-green-border aria-pressed:border-green"
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-2">{c.label}</dt>
            <dd className="text-2xl font-bold text-heading">{c.value}</dd>
          </button>
        ))}
      </dl>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-2" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or URL"
            aria-label="Search pages"
            className="pl-9"
          />
        </div>
        <select aria-label="Content type" className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as SeoKind | "all")}>
          <option value="all">All content types</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {SEO_KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <select aria-label="Status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">Any status</option>
          <option value="errors">Has errors</option>
          <option value="warnings">Warnings only</option>
          <option value="healthy">Healthy</option>
          <option value="custom">Customised</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <ul className="divide-y divide-line">
          {filtered.length === 0 && <li className="p-6 text-sm text-muted-2">No pages match these filters.</li>}
          {filtered.map((item) => (
            <li key={item.key} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-body">{SEO_KIND_LABELS[item.kind]}</span>
                  <span className="truncate font-medium text-heading">{item.label}</span>
                  {item.overridden && <span className="rounded-md bg-green/10 px-2 py-0.5 text-xs font-medium text-green">Customised</span>}
                  {item.draft && <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted-2">Draft override</span>}
                  {item.noindex && <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">noindex</span>}
                </div>
                <p className="truncate text-sm text-muted-2">{item.path}</p>
                <p className="truncate text-sm text-body">{item.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill errors={item.errors} warnings={item.warnings} />
                <a
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-background px-2.5 py-1 text-xs font-medium text-body hover:border-green-border hover:text-green"
                >
                  <ExternalLink className="size-3.5" aria-hidden /> View
                </a>
                <Link
                  href={`/admin/seo/edit?key=${encodeURIComponent(item.key)}`}
                  className="inline-flex items-center gap-1 rounded-md bg-green px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  <Pencil className="size-3.5" aria-hidden /> Edit SEO
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function StatusPill({ errors, warnings }: { errors: number; warnings: number }) {
  if (errors > 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
        <AlertCircle className="size-4" aria-hidden /> {errors} error{errors > 1 ? "s" : ""}
      </span>
    )
  if (warnings > 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-body">
        <AlertTriangle className="size-4" aria-hidden /> {warnings} warning{warnings > 1 ? "s" : ""}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green">
      <CheckCircle2 className="size-4" aria-hidden /> Healthy
    </span>
  )
}

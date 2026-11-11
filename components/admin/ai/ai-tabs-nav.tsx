import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Range } from "@/lib/ai-assistant/analytics"

export const AI_TABS = [
  { key: "overview", label: "Overview" },
  { key: "questions", label: "Questions & Answers" },
  { key: "corrections", label: "Answer Corrections" },
  { key: "knowledge", label: "Knowledge" },
  { key: "improvement", label: "Improvement" },
  { key: "cost", label: "Usage, Cost & Credits", adminOnly: true },
  { key: "users", label: "User Analytics", adminOnly: true },
  { key: "settings", label: "Budget & Models", adminOnly: true },
  { key: "api", label: "API Configuration", adminOnly: true },
  { key: "audit", label: "Security & Audit", adminOnly: true },
] as const satisfies readonly { key: string; label: string; adminOnly?: boolean }[]

export type AiTab = (typeof AI_TABS)[number]["key"]

export function AiTabsNav({ active, isSuperAdmin }: { active: AiTab; isSuperAdmin: boolean }) {
  return (
    <nav aria-label="AI management sections" className="-mx-1 overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1 px-1">
        {AI_TABS.filter((t) => isSuperAdmin || !("adminOnly" in t)).map((t) => (
          <li key={t.key}>
            <Link
              href={`/admin/ai?tab=${t.key}`}
              aria-current={active === t.key ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active === t.key ? "border-green text-green" : "border-transparent text-muted-2 hover:text-heading",
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

const RANGE_LABELS: Record<Range, string> = { day: "Today", week: "7 days", month: "This month", all: "All time" }

export function RangeFilter({ tab, range, extra = "" }: { tab: AiTab; range: Range; extra?: string }) {
  return (
    <div role="group" aria-label="Time range" className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
        <Link
          key={r}
          href={`/admin/ai?tab=${tab}&range=${r}${extra}`}
          aria-current={range === r ? "true" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            range === r ? "bg-green text-primary-foreground" : "text-muted-2 hover:text-heading",
          )}
        >
          {RANGE_LABELS[r]}
        </Link>
      ))}
    </div>
  )
}

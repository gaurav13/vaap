"use client"

import { cn } from "@/lib/utils"

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: readonly { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            value === t.value ? "border-green text-green" : "border-transparent text-body hover:text-heading",
          )}
        >
          {t.label}
          {typeof t.count === "number" && <span className="rounded-full bg-surface px-2 text-xs text-muted-2">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

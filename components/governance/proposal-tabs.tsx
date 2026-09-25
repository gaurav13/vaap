"use client"

import { useState, type ReactNode } from "react"
import { BarChart3, CalendarDays, FileText, MessagesSquare } from "lucide-react"

const ICONS = {
  overview: CalendarDays,
  documents: FileText,
  discussion: MessagesSquare,
  results: BarChart3,
} as const

export type ProposalTab = { id: keyof typeof ICONS; label: string; content: ReactNode }

export function ProposalTabs({ tabs, initial = "overview" }: { tabs: ProposalTab[]; initial?: ProposalTab["id"] }) {
  const [active, setActive] = useState<ProposalTab["id"]>(initial)

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-background shadow-sm">
      <div role="tablist" aria-label="Proposal sections" className="flex overflow-x-auto border-b border-line px-3 sm:px-5">
        {tabs.map((t) => {
          const Icon = ICONS[t.id]
          const selected = t.id === active
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(t.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition-colors ${
                selected ? "border-green text-green" : "border-transparent text-muted-2 hover:text-heading"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {t.label}
            </button>
          )
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          id={`panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
          className="p-5 sm:p-7"
        >
          {t.content}
        </div>
      ))}
    </div>
  )
}

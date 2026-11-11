"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CATEGORIES, PLATFORMS, type CategoryRules } from "@/lib/social-agent/config"
import { saveCategoryRules } from "@/app/actions/social-agent"
import { Notice, useAgentAction } from "./ui"

type Rules = CategoryRules & { detectFrom: string | null; hasActiveTemplate: boolean }

export function CategoryRulesList({ rules }: { rules: Record<string, Rules> }) {
  return (
    <div className="flex flex-col gap-4">
      {CATEGORIES.map((c) => (
        <CategoryCard key={c.key} category={c.key} label={c.label} source={c.source} initial={rules[c.key]} />
      ))}
    </div>
  )
}

function CategoryCard({ category, label, source, initial }: { category: string; label: string; source: string; initial: Rules }) {
  const [r, setR] = useState(initial)
  const { pending, message, run } = useAgentAction()
  const id = (s: string) => `${category}-${s}`
  return (
    <section aria-labelledby={id("h")} className="flex flex-col gap-4 rounded-lg border border-line bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={id("h")} className="font-serif text-lg font-bold text-heading">{label}</h3>
          <p className="text-sm text-muted-2">Source: {source}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${initial.hasActiveTemplate ? "bg-mint text-green" : "bg-warning-bg text-warning"}`}>
          {initial.hasActiveTemplate ? "Template ready" : "No active template"}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={r.enabled} onCheckedChange={(v) => setR({ ...r, enabled: v === true })} /> Category enabled
        </Label>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={r.autoGenerate} onCheckedChange={(v) => setR({ ...r, autoGenerate: v === true })} /> Auto-create drafts for new approved records
        </Label>
      </div>
      {initial.autoGenerate && initial.detectFrom && (
        <p className="text-xs text-muted-2">Detecting records approved after {new Date(initial.detectFrom).toLocaleString("en-GB")}.</p>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-heading">Platforms</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {PLATFORMS.map((p) => (
            <Label key={p.key} className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={r.platforms.includes(p.key)}
                onCheckedChange={(v) => setR({ ...r, platforms: v === true ? [...r.platforms, p.key] : r.platforms.filter((x) => x !== p.key) })}
              />
              {p.label}
              {"needsVideo" in p && <span className="text-xs text-muted-2">(video)</span>}
            </Label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("rules")}>Caption rules</Label>
          <Textarea id={id("rules")} rows={3} maxLength={1500} value={r.captionRules} onChange={(e) => setR({ ...r, captionRules: e.target.value })} placeholder="e.g. Congratulate the person and mention their organization first." />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("tags")}>Preferred hashtags</Label>
          <Input id={id("tags")} maxLength={300} value={r.hashtags} onChange={(e) => setR({ ...r, hashtags: e.target.value })} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={pending} onClick={() => run(() => saveCategoryRules({ category, ...r }), "Saved.")}>
          Save {label}
        </Button>
        <Notice message={message} />
      </div>
    </section>
  )
}

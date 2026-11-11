"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PLATFORMS } from "@/lib/social-agent/config"
import { saveAccount, saveAutomationSettings, scanNow } from "@/app/actions/social-agent"
import { Notice, useAgentAction } from "./ui"

type Account = { platform: string; handle: string; profileUrl: string; notes: string }

export function AccountsPanel({ accounts }: { accounts: Account[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md border border-line bg-surface p-3 text-sm text-body">
        Posts are published manually from the approved banner and caption. Record the official VAAP account for each platform here so the team
        always posts from the right place. Direct API publishing can be connected later without changing the approval flow.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {PLATFORMS.map((p) => (
          <AccountCard key={p.key} label={p.label} initial={accounts.find((a) => a.platform === p.key) ?? { platform: p.key, handle: "", profileUrl: "", notes: "" }} />
        ))}
      </div>
    </div>
  )
}

function AccountCard({ label, initial }: { label: string; initial: Account }) {
  const [a, setA] = useState(initial)
  const { pending, message, run } = useAgentAction()
  const id = (s: string) => `acc-${a.platform}-${s}`
  return (
    <section aria-labelledby={id("h")} className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 id={id("h")} className="font-semibold text-heading">{label}</h3>
        <span className={`text-xs font-semibold ${initial.profileUrl ? "text-green" : "text-muted-2"}`}>{initial.profileUrl ? "Recorded" : "Not set"}</span>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={id("handle")}>Handle</Label>
        <Input id={id("handle")} value={a.handle} onChange={(e) => setA({ ...a, handle: e.target.value })} placeholder="@vaap" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={id("url")}>Profile URL</Label>
        <Input id={id("url")} type="url" value={a.profileUrl} onChange={(e) => setA({ ...a, profileUrl: e.target.value })} placeholder="https://…" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={id("notes")}>Notes</Label>
        <Input id={id("notes")} value={a.notes} onChange={(e) => setA({ ...a, notes: e.target.value })} placeholder="Who has access, posting guidelines…" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={pending} onClick={() => run(() => saveAccount(a), "Saved.")}>Save</Button>
        <Notice message={message} />
      </div>
    </section>
  )
}

export function AutomationPanel({ initial }: { initial: { enabled: boolean; maxPerCategory: number; lastRunAt: string | null; lastRunSummary: string } }) {
  const [enabled, setEnabled] = useState(initial.enabled)
  const [max, setMax] = useState(initial.maxPerCategory)
  const { pending, message, run } = useAgentAction()
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-card p-4">
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} /> Run the daily scan for newly approved records
      </Label>
      <p className="text-sm text-muted-2">
        The daily scan only creates drafts for categories with auto-create turned on. Nothing is published without Super Admin approval.
      </p>
      <div className="flex max-w-xs flex-col gap-1">
        <Label htmlFor="auto-max">Maximum drafts per category per run</Label>
        <Input id="auto-max" type="number" min={1} max={10} value={max} onChange={(e) => setMax(Number(e.target.value) || 1)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => saveAutomationSettings({ enabled, maxPerCategory: max }), "Automation settings saved.")}>
          Save
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => scanNow(), (r) => `Scan finished: ${"created" in r ? r.created : 0} draft(s) created.`)}>
          {pending ? "Scanning…" : "Scan now"}
        </Button>
      </div>
      <Notice message={message} />
      {initial.lastRunAt && (
        <p className="text-sm text-body">
          Last run {new Date(initial.lastRunAt).toLocaleString("en-GB")}: {initial.lastRunSummary}
        </p>
      )}
    </div>
  )
}

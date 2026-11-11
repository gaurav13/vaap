"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PLATFORMS, type PlatformKey } from "@/lib/social-agent/config"
import { CONNECTIONS, CONNECTION_STATUS, type ConnectionView } from "@/lib/social-agent/connections"
import {
  disconnectPlatform,
  saveAccount,
  saveAutomationSettings,
  saveConnection,
  scanNow,
  testPlatformConnection,
} from "@/app/actions/social-agent"
import { Notice, useAgentAction } from "./ui"

type Account = { platform: string; handle: string; profileUrl: string; notes: string }

export function AccountsPanel({ accounts }: { accounts: ConnectionView[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md border border-line bg-surface p-3 text-sm leading-relaxed text-body">
        Connect each platform with its official API credentials. When a post is approved, VAAP publishes it automatically to every connected
        platform; platforms that are not connected stay on the manual &ldquo;mark as published&rdquo; flow. Secrets are encrypted on the server
        and never shown again after saving.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {PLATFORMS.map((p) => {
          const view = accounts.find((a) => a.platform === p.key)
          return view ? <AccountCard key={p.key} label={p.label} view={view} /> : null
        })}
      </div>
    </div>
  )
}

function ConnectionForm({ platform, view }: { platform: PlatformKey; view: ConnectionView }) {
  const spec = CONNECTIONS[platform]
  const [values, setValues] = useState<Record<string, string>>({})
  const { pending, message, run } = useAgentAction()
  const status = view.status
  const id = (s: string) => `conn-${platform}-${s}`
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-heading">API connection</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            status === "connected" ? "bg-green-soft text-green" : status === "error" ? "bg-destructive/10 text-destructive" : "bg-surface text-muted-2"
          }`}
        >
          {CONNECTION_STATUS[status]}
          {status === "connected" && view.accountName ? ` · ${view.accountName}` : ""}
        </span>
      </div>
      {view.lastError ? <p className="text-xs text-destructive">{view.lastError}</p> : null}
      {spec.fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-1">
          <Label htmlFor={id(f.key)}>
            {f.label}
            {f.optional ? <span className="font-normal text-muted-2"> (optional)</span> : null}
          </Label>
          <Input
            id={id(f.key)}
            type={f.secret ? "password" : "text"}
            autoComplete="off"
            value={values[f.key] ?? ""}
            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            placeholder={view.fields[f.key] ? (f.secret ? `Saved (${view.fields[f.key]}). Leave blank to keep.` : (view.fields[f.key] ?? "")) : f.placeholder}
          />
          {f.help ? <p className="text-xs text-muted-2">{f.help}</p> : null}
        </div>
      ))}
      <details className="text-xs text-body">
        <summary className="cursor-pointer font-semibold text-heading">Permissions and requirements</summary>
        <div className="flex flex-col gap-2 pt-2">
          <p>
            <span className="font-semibold">Publishes:</span> {spec.publishes}
          </p>
          <p>
            <span className="font-semibold">Scopes:</span> <span className="font-mono">{spec.permissions.join(", ")}</span>
          </p>
          <ul className="list-disc pl-4">
            {spec.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <a href={spec.portal.url} target="_blank" rel="noreferrer" className="font-semibold text-green underline">
            {spec.portal.label}
          </a>
        </div>
      </details>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const r = await saveConnection({ platform, values })
              if (!("error" in r)) setValues({})
              return r
            }, "Connected.")
          }
        >
          Save and test
        </Button>
        {status !== "not_connected" ? (
          <>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => testPlatformConnection(platform), "Connection works.")}>
              Test
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => disconnectPlatform(platform), "Disconnected.")}>
              Disconnect
            </Button>
          </>
        ) : null}
        <Notice message={message} />
      </div>
    </div>
  )
}

function AccountCard({ label, view }: { label: string; view: ConnectionView }) {
  const initial: Account = { platform: view.platform, handle: view.handle, profileUrl: view.profileUrl, notes: view.notes }
  const [a, setA] = useState(initial)
  const { pending, message, run } = useAgentAction()
  const id = (s: string) => `acc-${a.platform}-${s}`
  return (
    <section aria-labelledby={id("h")} className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 id={id("h")} className="font-semibold text-heading">{label}</h3>
        <span className={`text-xs font-semibold ${initial.profileUrl ? "text-green" : "text-muted-2"}`}>{initial.profileUrl ? "Profile recorded" : "Profile not set"}</span>
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
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => saveAccount(a), "Saved.")}>Save profile</Button>
        <Notice message={message} />
      </div>
      <ConnectionForm platform={view.platform as PlatformKey} view={view} />
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

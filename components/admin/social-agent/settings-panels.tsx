"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PLATFORMS, platformLabel, type PlatformKey } from "@/lib/social-agent/config"
import { CONNECTIONS, CONNECTION_STATUS, OAUTH_APPS, OAUTH_PROVIDER, type ConnectionView } from "@/lib/social-agent/connections"
import {
  disconnectPlatform,
  saveAccount,
  saveAutomationSettings,
  saveConnection,
  scanNow,
  selectConnectionDestination,
  testPlatformConnection,
} from "@/app/actions/social-agent"
import { Notice, useAgentAction } from "./ui"

type Account = { platform: string; handle: string; profileUrl: string; notes: string }

export type OAuthSetup = { callbackUrl: string; configured: Record<PlatformKey, boolean> }
export type OAuthNotice = { platform: string; tone: "error" | "success"; text: string } | null

export function AccountsPanel({ accounts, setup, notice }: { accounts: ConnectionView[]; setup: OAuthSetup; notice: OAuthNotice }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md border border-line bg-surface p-3 text-sm leading-relaxed text-body">
        Click <span className="font-semibold">Connect</span> on a platform, sign in with the account that manages the VAAP page, and approve the
        requested permissions. Approved posts then publish automatically to every connected platform. Tokens are encrypted on the server and
        never shown in the browser. Platforms that are not connected stay on the manual &ldquo;mark as published&rdquo; flow.
      </p>
      {notice && !PLATFORMS.some((p) => p.key === notice.platform) ? <Notice message={notice} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {PLATFORMS.map((p) => {
          const view = accounts.find((a) => a.platform === p.key)
          return view ? (
            <AccountCard
              key={p.key}
              label={p.label}
              view={view}
              setup={setup}
              notice={notice?.platform === p.key ? notice : null}
            />
          ) : null
        })}
      </div>
    </div>
  )
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"

function StatusPill({ view }: { view: ConnectionView }) {
  const s = view.status
  const tone =
    s === "connected" ? "bg-green-soft text-green" : s === "error" ? "bg-destructive/10 text-destructive" : s === "pending" ? "bg-warning/15 text-warning" : "bg-surface text-muted-2"
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {CONNECTION_STATUS[s]}
      {s === "connected" && view.accountName ? ` · ${view.accountName}` : ""}
    </span>
  )
}

function SetupGuide({ platform, setup }: { platform: PlatformKey; setup: OAuthSetup }) {
  const app = OAUTH_APPS[OAUTH_PROVIDER[platform]]
  const [copied, setCopied] = useState(false)
  return (
    <details className="rounded-md border border-line bg-surface p-3 text-xs text-body" open={!setup.configured[platform]}>
      <summary className="cursor-pointer font-semibold text-heading">
        {setup.configured[platform] ? "Developer app setup" : "One-time setup required before connecting"}
      </summary>
      <div className="flex flex-col gap-2 pt-2 leading-relaxed">
        <p>
          A developer creates the <span className="font-semibold">{app.label}</span> once and adds its keys as server environment variables:{" "}
          <span className="font-mono">{app.idEnv[0]}</span> and <span className="font-mono">{app.secretEnv[0]}</span>.
        </p>
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-heading">Callback URL to register</span>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-card px-2 py-1 font-mono">{setup.callbackUrl}</code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(setup.callbackUrl).then(() => setCopied(true))}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <ol className="list-decimal pl-4">
          {app.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p>
          <span className="font-semibold">Platform approval:</span> {app.review}
        </p>
        <a href={app.portal.url} target="_blank" rel="noreferrer" className="font-semibold text-green underline">
          Open {app.portal.label}
        </a>
      </div>
    </details>
  )
}

function OAuthConnection({ platform, view, setup, notice }: { platform: PlatformKey; view: ConnectionView; setup: OAuthSetup; notice: OAuthNotice }) {
  const spec = CONNECTIONS[platform]
  const { pending, message, run } = useAgentAction()
  const o = view.oauth
  const configured = setup.configured[platform]
  const connected = view.status === "connected" || view.status === "error"
  const startHref = `/api/admin/social/oauth/start/${platform}`
  const refreshEnds = o.refreshExpiresAt ?? (o.autoRefresh ? null : o.expiresAt)

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-heading">API connection</span>
        <StatusPill view={view} />
      </div>
      <Notice message={notice} />
      {view.lastError ? (
        <p role="alert" className="text-xs text-destructive">
          {view.lastError}
        </p>
      ) : null}

      {view.status === "pending" && o.pending.length ? (
        <fieldset className="flex flex-col gap-2 rounded-md border border-warning/40 p-3">
          <legend className="px-1 text-xs font-semibold text-heading">Choose where VAAP should publish</legend>
          {o.pending.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-heading">{d.name}</span>
                <span className="truncate text-xs text-muted-2">{d.detail}</span>
              </div>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => run(() => selectConnectionDestination({ platform, destinationId: d.id }), (r) => `Connected to ${"accountName" in r ? r.accountName : d.name}.`)}
              >
                Use this account
              </Button>
            </div>
          ))}
        </fieldset>
      ) : null}

      {connected ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex flex-col">
            <dt className="text-muted-2">Connected via</dt>
            <dd className="font-semibold text-heading">{o.mode === "oauth" ? "Sign-in (OAuth)" : "Manual tokens"}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-muted-2">Last publication</dt>
            <dd className="font-semibold text-heading">{fmtDate(view.lastPublishedAt)}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-muted-2">Token renewal</dt>
            <dd className="font-semibold text-heading">{o.mode === "oauth" ? (o.autoRefresh ? "Automatic" : "Reconnect when prompted") : "Managed manually"}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-muted-2">{refreshEnds ? "Authorization expires" : "Last checked"}</dt>
            <dd className="font-semibold text-heading">{fmtDate(refreshEnds ?? view.lastCheckedAt)}</dd>
          </div>
        </dl>
      ) : null}

      {o.missingScopes.length ? (
        <p className="rounded-md bg-warning/10 p-2 text-xs text-body">
          <span className="font-semibold text-heading">Missing permissions:</span> <span className="font-mono">{o.missingScopes.join(", ")}</span>.
          Reconnect and approve every permission, or publishing may fail.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {configured ? (
          <a
            href={startHref}
            className={`inline-flex h-8 items-center rounded-md px-3 text-sm font-semibold ${
              connected ? "border border-line bg-card text-heading hover:bg-surface" : "bg-green text-primary-foreground hover:bg-green-hover"
            }`}
          >
            {connected || view.status === "pending" ? "Reconnect" : `Connect ${platformLabel(platform)}`}
          </a>
        ) : (
          <Button size="sm" disabled>
            Connect {platformLabel(platform)}
          </Button>
        )}
        {view.status !== "not_connected" ? (
          <>
            {connected ? (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => testPlatformConnection(platform), "Connection works.")}>
                Test
              </Button>
            ) : null}
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => disconnectPlatform(platform), "Disconnected.")}>
              Disconnect
            </Button>
          </>
        ) : null}
        <Notice message={message} />
      </div>
      {!configured ? <p className="text-xs text-muted-2">Connect is enabled once the developer app keys are added (see setup below).</p> : null}

      <p className="text-xs text-muted-2">
        <span className="font-semibold">Requests:</span> <span className="font-mono">{spec.permissions.join(", ")}</span>. {spec.publishes}
      </p>
      <SetupGuide platform={platform} setup={setup} />
      <details className="text-xs text-body">
        <summary className="cursor-pointer font-semibold text-heading">Advanced: enter tokens manually</summary>
        <div className="pt-2">
          <ConnectionForm platform={platform} view={view} />
        </div>
      </details>
    </div>
  )
}

function ConnectionForm({ platform, view }: { platform: PlatformKey; view: ConnectionView }) {
  const spec = CONNECTIONS[platform]
  const [values, setValues] = useState<Record<string, string>>({})
  const { pending, message, run } = useAgentAction()
  const id = (s: string) => `conn-${platform}-${s}`
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-2">Use only if sign-in is unavailable. Saving manual tokens replaces the OAuth connection.</p>
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
      <ul className="list-disc pl-4 text-muted-2">
        {spec.requirements.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
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
        <Notice message={message} />
      </div>
    </div>
  )
}

function AccountCard({ label, view, setup, notice }: { label: string; view: ConnectionView; setup: OAuthSetup; notice: OAuthNotice }) {
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
      <OAuthConnection platform={view.platform as PlatformKey} view={view} setup={setup} notice={notice} />
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

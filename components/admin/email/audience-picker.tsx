"use client"

import { useState, useTransition } from "react"
import { Plus, Search, X } from "lucide-react"
import { searchContacts } from "@/app/actions/newsletters"
import { AUDIENCE_GROUPS, EMAIL_RE, type AudienceGroup, type AudienceSelection } from "@/lib/newsletter/content"
import { cn } from "@/lib/utils"
import { Btn, inputCls, isComposing } from "./shared"

type Found = { email: string; name: string; status: string }

function parseEmails(raw: string) {
  const valid: string[] = []
  let invalid = 0
  for (const part of raw.split(/[\s,;]+/)) {
    const e = part.trim().toLowerCase()
    if (!e) continue
    if (EMAIL_RE.test(e)) valid.push(e)
    else invalid++
  }
  return { valid, invalid }
}

function EmailChips({ list, onRemove, empty }: { list: string[]; onRemove: (e: string) => void; empty: string }) {
  if (!list.length) return <p className="text-xs text-muted-2">{empty}</p>
  return (
    <ul className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
      {list.map((e) => (
        <li key={e} className="flex items-center gap-1 rounded-full bg-surface py-1 pl-3 pr-1 text-xs text-heading">
          {e}
          <button type="button" onClick={() => onRemove(e)} className="rounded-full p-0.5 hover:bg-line" aria-label={`Remove ${e}`}>
            <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function AudiencePicker({
  value,
  onChange,
  plans,
  canSearch,
  heading,
}: {
  value: AudienceSelection
  onChange: (a: AudienceSelection) => void
  plans: string[]
  canSearch: boolean
  heading: string
}) {
  const [custom, setCustom] = useState(value.include.length > 0 || value.exclude.length > 0)
  const [query, setQuery] = useState("")
  const [found, setFound] = useState<Found[] | null>(null)
  const [searchError, setSearchError] = useState("")
  const [paste, setPaste] = useState("")
  const [excludeRaw, setExcludeRaw] = useState("")
  const [note, setNote] = useState("")
  const [searching, startSearch] = useTransition()

  const toggleGroup = (g: AudienceGroup) => {
    const has = value.groups.includes(g)
    onChange({ ...value, groups: has ? value.groups.filter((x) => x !== g) : [...value.groups, g] })
  }
  const togglePlan = (p: string) => {
    const has = value.plans.includes(p)
    onChange({ ...value, plans: has ? value.plans.filter((x) => x !== p) : [...value.plans, p] })
  }
  const addInclude = (emails: string[]) => onChange({ ...value, include: [...new Set([...value.include, ...emails])] })

  const runSearch = () => {
    if (query.trim().length < 2) return
    startSearch(async () => {
      const res = await searchContacts(query)
      if (res.ok) {
        setFound(res.contacts)
        setSearchError("")
      } else setSearchError(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-serif text-lg font-bold text-heading">{heading}</legend>
        <p className="text-sm leading-relaxed text-muted-2">
          Tick one or more categories. Anyone who matches more than one is emailed only once.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {AUDIENCE_GROUPS.map((g) => {
            const checked = value.groups.includes(g.value)
            return (
              <label
                key={g.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                  checked ? "border-green bg-mint" : "border-line bg-card hover:bg-surface",
                )}
              >
                <input type="checkbox" checked={checked} onChange={() => toggleGroup(g.value)} className="mt-0.5 size-4 accent-green" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-heading">{g.label}</span>
                  <span className="text-xs leading-relaxed text-muted-2">{g.hint}</span>
                </span>
              </label>
            )
          })}
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
              custom ? "border-green bg-mint" : "border-line bg-card hover:bg-surface",
            )}
          >
            <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} className="mt-0.5 size-4 accent-green" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-heading">Custom Selection</span>
              <span className="text-xs leading-relaxed text-muted-2">Add or exclude specific people by email.</span>
            </span>
          </label>
        </div>
      </fieldset>

      {plans.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-heading">Limit members to these plans (optional)</legend>
          <div className="flex flex-wrap gap-2">
            {plans.map((p) => {
              const on = value.plans.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => togglePlan(p)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    on ? "border-green bg-green text-primary-foreground" : "border-line bg-card text-body hover:bg-surface",
                  )}
                >
                  {p}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-2">Leave all unselected to include every plan.</p>
        </fieldset>
      )}

      {custom && (
        <div className="flex flex-col gap-5 rounded-xl border border-line p-4">
          {canSearch && (
            <div className="flex flex-col gap-2">
              <label htmlFor="aud-search" className="text-sm font-semibold text-heading">
                Find a member or contact
              </label>
              <div className="flex gap-2">
                <input
                  id="aud-search"
                  className={inputCls}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isComposing(e)) {
                      e.preventDefault()
                      runSearch()
                    }
                  }}
                  placeholder="Name or email"
                />
                <Btn variant="secondary" onClick={runSearch} disabled={searching || query.trim().length < 2}>
                  <Search className="size-4" aria-hidden="true" />
                  {searching ? "Searching…" : "Search"}
                </Btn>
              </div>
              {searchError && <p className="text-xs text-destructive">{searchError}</p>}
              {found && (
                <ul className="flex max-h-56 flex-col divide-y divide-line overflow-y-auto rounded-lg border border-line">
                  {found.length === 0 && <li className="p-3 text-sm text-muted-2">No matches.</li>}
                  {found.map((f) => {
                    const added = value.include.includes(f.email)
                    return (
                      <li key={f.email} className="flex items-center justify-between gap-3 p-3">
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-semibold text-heading">{f.name || f.email}</span>
                          <span className="truncate text-xs text-muted-2">
                            {f.email} · {f.status}
                          </span>
                        </span>
                        <Btn variant={added ? "ghost" : "secondary"} className="h-8 shrink-0 px-3" disabled={added} onClick={() => addInclude([f.email])}>
                          {added ? "Added" : <><Plus className="size-3.5" aria-hidden="true" />Add</>}
                        </Btn>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="aud-paste" className="text-sm font-semibold text-heading">
              Add email addresses
            </label>
            <textarea
              id="aud-paste"
              rows={3}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-heading outline-none focus-visible:border-green focus-visible:ring-2 focus-visible:ring-green/20"
              placeholder="Separate with commas or new lines"
            />
            <div className="flex items-center gap-3">
              <Btn
                variant="secondary"
                className="h-9"
                disabled={!paste.trim()}
                onClick={() => {
                  const { valid, invalid } = parseEmails(paste)
                  addInclude(valid)
                  setPaste("")
                  setNote(`${valid.length} added${invalid ? `, ${invalid} invalid ignored` : ""}.`)
                }}
              >
                Add to recipients
              </Btn>
              {note && <span className="text-xs text-muted-2" role="status">{note}</span>}
            </div>
            <EmailChips list={value.include} onRemove={(e) => onChange({ ...value, include: value.include.filter((x) => x !== e) })} empty="No one added manually." />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="aud-exclude" className="text-sm font-semibold text-heading">
              Exclude email addresses
            </label>
            <div className="flex gap-2">
              <input
                id="aud-exclude"
                className={inputCls}
                value={excludeRaw}
                onChange={(e) => setExcludeRaw(e.target.value)}
                placeholder="name@example.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isComposing(e)) {
                    e.preventDefault()
                    const { valid } = parseEmails(excludeRaw)
                    if (valid.length) onChange({ ...value, exclude: [...new Set([...value.exclude, ...valid])] })
                    setExcludeRaw("")
                  }
                }}
              />
              <Btn
                variant="secondary"
                disabled={!excludeRaw.trim()}
                onClick={() => {
                  const { valid } = parseEmails(excludeRaw)
                  if (valid.length) onChange({ ...value, exclude: [...new Set([...value.exclude, ...valid])] })
                  setExcludeRaw("")
                }}
              >
                Exclude
              </Btn>
            </div>
            <EmailChips list={value.exclude} onRemove={(e) => onChange({ ...value, exclude: value.exclude.filter((x) => x !== e) })} empty="No one excluded." />
          </div>
        </div>
      )}
    </div>
  )
}

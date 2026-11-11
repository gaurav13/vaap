"use client"

import { useActionState, useState, useTransition } from "react"
import { FileText, Globe, Loader2, RefreshCw, Search, Trash2, Type, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  addKnowledgeSource,
  deleteKnowledgeSource,
  refreshKnowledgeUrl,
  setKnowledgeActive,
  testKnowledgeSearch,
  type KnowledgeResult,
} from "@/app/actions/ai-knowledge"

export type KnowledgeSourceRow = {
  id: number
  title: string
  kind: string
  category: string
  sourceUrl: string | null
  fileName: string | null
  charCount: number
  chunkCount: number
  active: boolean
  updatedAt: string
}

type Mode = "file" | "url" | "text"

const MODES: { key: Mode; label: string; icon: typeof Upload }[] = [
  { key: "file", label: "Upload document", icon: Upload },
  { key: "url", label: "Read a web page", icon: Globe },
  { key: "text", label: "Write text", icon: Type },
]

const field =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"

export function AiKnowledgeManager({ sources, categories }: { sources: KnowledgeSourceRow[]; categories: readonly string[] }) {
  const [mode, setMode] = useState<Mode>("file")
  const [state, formAction, adding] = useActionState<KnowledgeResult | null, FormData>(addKnowledgeSource, null)

  return (
    <div className="mt-8 flex flex-col gap-8">
      <section aria-labelledby="add-source" className="rounded-xl border border-border bg-card p-5 lg:p-6">
        <h2 id="add-source" className="font-serif text-lg font-bold text-heading">
          Add knowledge
        </h2>
        <p className="mt-1 text-sm text-muted-2">
          Only add VAAP-approved content. The assistant answers from active sources and cites their titles.
        </p>

        <div role="tablist" aria-label="Source type" className="mt-5 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={mode === m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                mode === m.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50",
              )}
            >
              <m.icon className="size-4" aria-hidden />
              {m.label}
            </button>
          ))}
        </div>

        <form action={formAction} className="mt-5 flex flex-col gap-4" key={state?.ok ? state.message : "form"}>
          <input type="hidden" name="mode" value={mode} />
          <div className="flex flex-col gap-4 md:flex-row">
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-foreground">
              Title {mode !== "text" && <span className="font-normal text-muted-2">(optional)</span>}
              <input name="title" maxLength={200} required={mode === "text"} className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground md:w-56">
              Category
              <select name="category" defaultValue="general" className={cn(field, "capitalize")}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {mode === "file" && (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Document (PDF, DOCX, TXT or MD, up to 8 MB)
              <input
                type="file"
                name="file"
                required
                accept=".pdf,.docx,.txt,.md"
                className={cn(field, "file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm")}
              />
            </label>
          )}
          {mode === "url" && (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Page URL
              <input type="url" name="url" required placeholder="https://vaap.org.pk/about" className={field} />
            </label>
          )}
          {mode === "text" && (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Content
              <textarea name="text" required rows={8} minLength={40} className={cn(field, "leading-relaxed")} />
            </label>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {adding && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {adding ? "Reading and indexing" : "Add to knowledge base"}
            </button>
            {state && (
              <p role="status" className={cn("text-sm", state.ok ? "text-primary" : "text-destructive")}>
                {state.ok ? state.message : state.error}
              </p>
            )}
          </div>
        </form>
      </section>

      <SearchTester />

      <section aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="font-serif text-lg font-bold text-heading">
          Sources ({sources.length})
        </h2>
        {sources.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-2">
            No knowledge added yet. The assistant currently answers from its built-in rules and live website data only.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {sources.map((s) => (
              <SourceItem key={s.id} source={s} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function SourceItem({ source: s }: { source: KnowledgeSourceRow }) {
  const [pending, start] = useTransition()
  const [note, setNote] = useState("")
  const Icon = s.kind === "url" ? Globe : s.kind === "text" ? Type : FileText

  return (
    <li className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center", !s.active && "opacity-60")}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{s.title}</p>
          <p className="mt-0.5 text-xs text-muted-2">
            <span className="capitalize">{s.category}</span> · {s.kind.toUpperCase()} · {s.chunkCount} sections ·{" "}
            {Math.round(s.charCount / 1000)}k characters · updated {new Date(s.updatedAt).toLocaleDateString()}
          </p>
          {s.sourceUrl && (
            <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-xs text-primary underline-offset-2 hover:underline">
              {s.sourceUrl}
            </a>
          )}
          {note && <p role="status" className="mt-1 text-xs text-primary">{note}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={s.active}
            disabled={pending}
            onChange={(e) => start(() => setKnowledgeActive(s.id, e.target.checked))}
            className="size-4 accent-primary"
          />
          Active
        </label>
        {s.kind === "url" && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await refreshKnowledgeUrl(s.id)
                setNote(r.ok ? r.message : r.error)
              })
            }
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:border-primary/50"
          >
            <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden />
            Re-read
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          aria-label={`Delete ${s.title}`}
          onClick={() => {
            if (confirm(`Delete "${s.title}" from the knowledge base?`)) start(() => deleteKnowledgeSource(s.id))
          }}
          className="flex size-9 items-center justify-center rounded-lg border border-border text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  )
}

function SearchTester() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{ title: string; category: string; excerpt: string }[] | null>(null)
  const [pending, start] = useTransition()

  return (
    <section aria-labelledby="test-heading" className="rounded-xl border border-border bg-card p-5 lg:p-6">
      <h2 id="test-heading" className="font-serif text-lg font-bold text-heading">
        Test retrieval
      </h2>
      <p className="mt-1 text-sm text-muted-2">Check which sections the assistant would read for a question.</p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => setResults(await testKnowledgeSearch(query)))
        }}
      >
        <label htmlFor="kb-test" className="sr-only">
          Test question
        </label>
        <input id="kb-test" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. membership fee" className={field} />
        <button type="submit" disabled={pending || !query.trim()} className="flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
          Search
        </button>
      </form>
      {results && (
        <ul className="mt-4 flex flex-col gap-2">
          {results.length === 0 && <li className="text-sm text-muted-2">No matching knowledge found.</li>}
          {results.map((r, i) => (
            <li key={i} className="rounded-lg bg-secondary/60 p-3 text-sm">
              <p className="font-semibold text-foreground">
                {r.title} <span className="font-normal capitalize text-muted-2">· {r.category}</span>
              </p>
              <p className="mt-1 leading-relaxed text-muted-2">{r.excerpt}…</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

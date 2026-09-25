"use client"

import { useRef, useState } from "react"
import { FilePlus2, FileText, X } from "lucide-react"

export type StagedDocument = {
  key: string
  file: File
  title: string
  description: string
}

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.jpg,.jpeg,.png"
const ALLOWED_EXT = new Set(ACCEPT.split(",").map((s) => s.slice(1)))
const MAX_BYTES = 20 * 1024 * 1024
const MAX_FILES = 10

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ProposalDocumentsStaging({
  documents,
  onChange,
}: {
  documents: StagedDocument[]
  onChange: (docs: StagedDocument[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    setError("")
    const next = [...documents]
    const rejected: string[] = []
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
      if (!ALLOWED_EXT.has(ext)) rejected.push(`${file.name} (unsupported type)`)
      else if (file.size > MAX_BYTES) rejected.push(`${file.name} (over 20MB)`)
      else if (file.size === 0) rejected.push(`${file.name} (empty)`)
      else if (next.length >= MAX_FILES) rejected.push(`${file.name} (limit of ${MAX_FILES} files)`)
      else
        next.push({
          key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
          file,
          title: file.name.replace(/\.[^.]+$/, "").slice(0, 200),
          description: "",
        })
    }
    if (rejected.length) setError(`Not added: ${rejected.join(", ")}`)
    onChange(next)
  }

  function update(key: string, patch: Partial<StagedDocument>) {
    onChange(documents.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 block text-sm font-semibold text-heading">
        Supporting documents <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      <p className="-mt-1 text-xs text-muted-foreground">
        Uploaded when you create the proposal. Signed-in members can read and download them from the Documents tab.
      </p>

      {documents.length > 0 && (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li key={doc.key} className="flex flex-col gap-2 rounded-xl border border-line bg-background p-3 sm:flex-row sm:items-start">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green/10 text-green">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="truncate text-xs text-muted-foreground">
                  {doc.file.name} · {formatSize(doc.file.size)}
                </p>
                <input
                  value={doc.title}
                  maxLength={200}
                  onChange={(e) => update(doc.key, { title: e.target.value })}
                  aria-label={`Title for ${doc.file.name}`}
                  placeholder="Document title"
                  className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-heading outline-none focus:border-green"
                />
                <input
                  value={doc.description}
                  maxLength={500}
                  onChange={(e) => update(doc.key, { description: e.target.value })}
                  aria-label={`Description for ${doc.file.name}`}
                  placeholder="Short description (optional)"
                  className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-heading outline-none focus:border-green"
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(documents.filter((d) => d.key !== doc.key))}
                aria-label={`Remove ${doc.file.name}`}
                className="self-end rounded-lg border border-line p-2 text-muted-foreground hover:border-destructive hover:text-destructive sm:self-start"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {documents.length < MAX_FILES && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-background px-4 py-4 text-sm font-semibold text-heading transition-colors hover:border-green hover:text-green"
        >
          <FilePlus2 className="size-4 text-green" aria-hidden="true" />
          {documents.length ? "Add more documents" : "Add documents"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        onChange={onPick}
        className="sr-only"
        tabIndex={-1}
        aria-label="Supporting document files"
      />
      <p className="text-xs text-muted-foreground">
        PDF, Word, Excel, PowerPoint, CSV, TXT, JPG, or PNG. Max 20MB each, up to {MAX_FILES} files.
      </p>
      {error && (
        <p className="text-sm text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </fieldset>
  )
}

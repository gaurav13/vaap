"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FileText, Loader2, Trash2, Upload } from "lucide-react"
import { deleteProposalDocumentAction } from "@/app/actions/proposal-extras"

export type ManagedDocument = {
  id: number
  title: string
  description: string
  fileName: string
  fileType: string
  sizeLabel: string
  uploadedByName: string
  createdAt: string
}

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.jpg,.jpeg,.png"
const MAX_BYTES = 20 * 1024 * 1024

export function ProposalDocumentsManager({ proposalId, documents }: { proposalId: number; documents: ManagedDocument[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    const form = new FormData(e.currentTarget)
    const file = form.get("file")
    if (!(file instanceof File) || file.size === 0) return setError("Choose a file to upload.")
    if (file.size > MAX_BYTES) return setError("File is too large (max 20MB).")
    form.set("proposalId", String(proposalId))

    setUploading(true)
    try {
      const res = await fetch("/api/admin/proposal-documents", { method: "POST", body: form })
      const payload = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(payload?.error || "Upload failed.")
      formRef.current?.reset()
      setMessage("Document uploaded. Members can now read and download it.")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  function onDelete(doc: ManagedDocument) {
    if (!window.confirm(`Delete "${doc.title}"? Members will no longer be able to access it.`)) return
    setDeletingId(doc.id)
    startTransition(async () => {
      const res = await deleteProposalDocumentAction(doc.id)
      setDeletingId(null)
      if (!res.ok) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-6" aria-labelledby="docs-heading">
      <h2 id="docs-heading" className="inline-flex items-center gap-2 text-base font-bold text-heading">
        <FileText className="size-4 text-green" aria-hidden="true" /> Supporting documents
      </h2>
      <p className="mt-1 text-sm text-muted-2">
        Files uploaded here appear in the Documents tab of the public proposal page. Signed-in members can read and
        download them.
      </p>

      <form ref={formRef} onSubmit={onUpload} className="mt-5 grid gap-3 rounded-xl border border-dashed border-line bg-background p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-heading">
          Document title
          <input
            name="title"
            maxLength={200}
            placeholder="e.g. Board resolution draft"
            className="rounded-lg border border-line bg-background px-3 py-2 text-sm font-normal outline-none focus:border-green"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-heading">
          File
          <input
            name="file"
            type="file"
            required
            accept={ACCEPT}
            className="rounded-lg border border-line bg-background px-3 py-1.5 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-green/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-green"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-heading sm:col-span-2">
          Short description <span className="font-normal text-muted-2">(optional)</span>
          <input
            name="description"
            maxLength={500}
            placeholder="What members should know about this file"
            className="rounded-lg border border-line bg-background px-3 py-2 text-sm font-normal outline-none focus:border-green"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <p className="text-xs text-muted-2">PDF, Word, Excel, PowerPoint, CSV, TXT, JPG, or PNG. Max 20MB.</p>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            {uploading ? "Uploading…" : "Upload document"}
          </button>
        </div>
      </form>

      <div aria-live="polite" className="mt-3 text-sm">
        {error && <p className="text-destructive">{error}</p>}
        {message && <p className="text-green">{message}</p>}
      </div>

      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-muted-2">No documents uploaded yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green/10 text-xs font-bold uppercase text-green">
                {doc.fileType}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-heading">{doc.title}</p>
                <p className="truncate text-xs text-muted-2">
                  {doc.fileName} · {doc.sizeLabel} · {doc.uploadedByName || "Admin"} · {doc.createdAt}
                </p>
              </div>
              <a
                href={`/api/proposal-documents/${doc.id}/download?view=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-heading hover:border-green hover:text-green"
              >
                View
              </a>
              <button
                type="button"
                onClick={() => onDelete(doc)}
                disabled={deletingId === doc.id}
                aria-label={`Delete ${doc.title}`}
                className="rounded-lg border border-line p-2 text-muted-2 hover:border-destructive hover:text-destructive disabled:opacity-50"
              >
                {deletingId === doc.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

import Link from "next/link"
import { Download, Eye, FileText, Lock } from "lucide-react"
import { formatFileSize, type ProposalDocument } from "@/lib/proposal-extras"

export function ProposalDocumentsList({
  documents,
  loggedIn,
  loginHref,
}: {
  documents: ProposalDocument[]
  loggedIn: boolean
  loginHref: string
}) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-green/10 text-green">
          <FileText className="size-6" aria-hidden="true" />
        </span>
        <p className="font-semibold text-heading">No supporting documents</p>
        <p className="max-w-sm text-sm text-muted-2">Official documents attached to this proposal will appear here.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-lg font-bold text-heading">
          <FileText className="size-5 text-green" aria-hidden="true" /> Supporting Documents
        </h2>
        <span className="text-sm text-muted-2">
          {documents.length} {documents.length === 1 ? "file" : "files"}
        </span>
      </div>

      {!loggedIn && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green/30 bg-green/5 px-4 py-3 text-sm">
          <p className="inline-flex items-center gap-2 text-heading">
            <Lock className="size-4 text-green" aria-hidden="true" /> Sign in as a member to read and download documents.
          </p>
          <Link href={loginHref} className="font-semibold text-green hover:underline">
            Sign in
          </Link>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-green/10 text-xs font-bold uppercase text-green">
              {doc.fileType || "file"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-heading">{doc.title}</p>
              {doc.description && <p className="mt-0.5 text-sm leading-relaxed text-muted-2">{doc.description}</p>}
              <p className="mt-1 text-xs text-muted-2">
                {formatFileSize(doc.fileSize)} ·{" "}
                {new Date(doc.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            {loggedIn && (
              <div className="flex shrink-0 gap-2">
                <a
                  href={`/api/proposal-documents/${doc.id}/download?view=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-heading transition-colors hover:border-green hover:text-green"
                >
                  <Eye className="size-4" aria-hidden="true" /> Read
                </a>
                <a
                  href={`/api/proposal-documents/${doc.id}/download`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Download className="size-4" aria-hidden="true" /> Download
                </a>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

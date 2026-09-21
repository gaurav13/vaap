import Link from "next/link"
import { ArrowRight, Download, Eye, FileText } from "lucide-react"

type Doc = {
  id: number
  title: string
  category: string
  description: string
  fileUrl: string | null
  createdAt: Date | string
}

const FALLBACK_TITLES = [
  "Constitution / Articles of Association",
  "Code of Conduct",
  "Membership Policy",
  "Election Policy",
  "Committee Terms of Reference",
  "Conflict of Interest Policy",
]

function formatDate(value: Date | string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export function GovernanceDocuments({ documents }: { documents: Doc[] }) {
  const hasDocs = documents.length > 0

  return (
    <section className="bg-card">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green">Governance Documents</p>
            <h2 className="mt-3 text-pretty text-3xl font-bold tracking-tight text-heading sm:text-4xl">
              Governance Documents
            </h2>
            <p className="mt-3 max-w-3xl text-pretty text-base leading-relaxed text-body">
              Key documents defining VAAP&apos;s governance, responsibilities and operating standards.
            </p>
          </div>
          <Link
            href="/knowledge"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-green transition-colors hover:text-green-hover"
          >
            View All Documents
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasDocs
            ? documents.map((doc) => (
                <div key={doc.id} className="flex flex-col rounded-xl border border-line bg-card p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-pretty text-sm font-bold text-heading">{doc.title}</h3>
                      <p className="mt-0.5 text-xs text-body">
                        {doc.category}
                        {formatDate(doc.createdAt) ? ` \u2022 ${formatDate(doc.createdAt)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 border-t border-line pt-3">
                    {doc.fileUrl ? (
                      <>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-green transition-colors hover:text-green-hover"
                        >
                          <Eye className="size-4" /> View
                        </a>
                        <a
                          href={doc.fileUrl}
                          download
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-green transition-colors hover:text-green-hover"
                        >
                          <Download className="size-4" /> Download
                        </a>
                      </>
                    ) : (
                      <span className="text-xs text-muted-2">Document coming soon</span>
                    )}
                  </div>
                </div>
              ))
            : FALLBACK_TITLES.map((title) => (
                <div key={title} className="flex flex-col rounded-xl border border-line bg-card p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-pretty text-sm font-bold text-heading">{title}</h3>
                      <p className="mt-0.5 text-xs text-body">Governance Policy</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 border-t border-line pt-3">
                    <span className="text-xs text-muted-2">Awaiting upload</span>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </section>
  )
}

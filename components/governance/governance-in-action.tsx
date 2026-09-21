import Link from "next/link"
import { ArrowRight, Download } from "lucide-react"

type Doc = {
  id: number
  title: string
  category: string
  description: string
  fileUrl: string | null
  createdAt: Date | string
}

const FALLBACK_DOCS = [
  "Constitution / Articles of Association",
  "Code of Conduct",
  "Membership Policy",
  "Election Policy",
  "Committee Terms",
  "Conflict of Interest Policy",
]

function formatDate(value: Date | string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 44" className={className} fill="none" aria-hidden="true">
      <path
        d="M6 3a2 2 0 0 1 2-2h13l9 9v29a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V3Z"
        fill="#fff"
        stroke="#E5372A"
        strokeWidth="2"
      />
      <path d="M21 1v8a2 2 0 0 0 2 2h7" stroke="#E5372A" strokeWidth="2" strokeLinejoin="round" />
      <rect x="4" y="24" width="24" height="12" rx="2" fill="#E5372A" />
      <text
        x="16"
        y="33"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        fill="#fff"
        fontFamily="system-ui, sans-serif"
        letterSpacing="0.5"
      >
        PDF
      </text>
    </svg>
  )
}

const ROW =
  "flex items-center gap-4 py-5 border-b border-line last:border-b-0 " +
  "sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0"

export function GovernanceDocuments({ documents }: { documents: Doc[] }) {
  const docItems =
    documents.length > 0
      ? documents.slice(0, 6).map((d) => ({
          key: String(d.id),
          title: d.title,
          meta: [d.category, formatDate(d.createdAt)].filter(Boolean).join(" \u00b7 "),
          fileUrl: d.fileUrl,
        }))
      : FALLBACK_DOCS.map((title) => ({
          key: title,
          title,
          meta: "Version 1.0 \u00b7 Jan 2024",
          fileUrl: null as string | null,
        }))

  return (
    <section className="bg-card">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green">Governance Documents</p>
          <span aria-hidden className="h-px w-8 bg-green/50" />
        </div>
        <h2 className="mt-4 text-pretty font-serif text-3xl font-bold tracking-tight text-heading sm:text-4xl">
          Governance Documents
        </h2>
        <p className="mt-3 max-w-3xl text-pretty text-base leading-relaxed text-body">
          Key documents defining VAAP&apos;s governance, membership, responsibilities and operating standards.
        </p>

        <div className="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-green">Governance Documents</h3>
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-green transition-colors hover:text-green-hover"
            >
              View All <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-2 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {docItems.map((doc) => (
              <div key={doc.key} className={ROW}>
                <PdfIcon className="h-11 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-pretty text-sm font-bold leading-snug text-heading">{doc.title}</p>
                  <p className="mt-1 text-xs text-body">{doc.meta}</p>
                </div>
                {doc.fileUrl ? (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-green transition-colors hover:text-green-hover"
                  >
                    View <Download className="size-4" />
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-muted-2">Soon</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

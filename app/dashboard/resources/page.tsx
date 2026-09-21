import { redirect } from "next/navigation"
import { BookOpen, Download, FileText, Lock } from "lucide-react"
import { getSession } from "@/lib/session"
import { getPublications, getDocuments } from "@/app/actions/cms"
import { PageHeading } from "@/components/member/page-heading"

export default async function ResourcesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const [publications, documents] = await Promise.all([getPublications(), getDocuments()])

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeading
        title="Knowledge & Resources"
        description="Research publications, reports, and reference documents for VAAP members."
      />

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-heading">
          <BookOpen className="size-4 text-green" /> Publications
        </h2>
        {publications.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
            No publications available yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publications.map((p) => (
              <article key={p.id} className="flex flex-col rounded-2xl border border-line bg-card p-5">
                <span className="mb-2 inline-flex w-fit rounded-full bg-mint px-2.5 py-0.5 text-xs font-semibold text-green">
                  {p.category}
                </span>
                <h3 className="text-sm font-bold text-heading text-balance">{p.title}</h3>
                {p.description && <p className="mt-1 line-clamp-3 text-xs text-muted-2">{p.description}</p>}
                <div className="mt-3 flex items-center justify-between">
                  {p.author && <span className="truncate text-xs text-muted-2">{p.author}</span>}
                  {p.membersOnly && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green">
                      <Lock className="size-3" /> Members
                    </span>
                  )}
                </div>
                {p.pdfUrl && (
                  <a
                    href={p.pdfUrl}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:text-green-hover"
                  >
                    <Download className="size-4" /> Download
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-heading">
          <FileText className="size-4 text-green" /> Documents
        </h2>
        {documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
            No documents available yet.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-line bg-card">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center gap-4 border-b border-line p-4 last:border-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-heading">{d.title}</p>
                  <p className="truncate text-xs text-muted-2">{d.category}</p>
                </div>
                {d.fileUrl && (
                  <a
                    href={d.fileUrl}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-green hover:bg-mint"
                  >
                    <Download className="size-3.5" /> Open
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

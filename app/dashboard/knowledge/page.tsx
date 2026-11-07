import { redirect } from "next/navigation"
import { BookOpen, Download, Lock } from "lucide-react"
import { getSession } from "@/lib/session"
import { getPublications } from "@/app/actions/cms"
import { PageHeading } from "@/components/member/page-heading"

export const metadata = {
  title: "Knowledge | VAAP Dashboard",
}

export default async function KnowledgePage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const publications = await getPublications()

  return (
    <div className="w-full">
      <PageHeading
        title="Knowledge"
        description="Research publications, industry reports, and insights from the VAAP network."
      />

      {publications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-card p-12 text-center">
          <BookOpen className="size-8 text-muted-2" />
          <p className="text-sm font-semibold text-heading">No publications yet</p>
          <p className="text-sm text-muted-2">New research and reports will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publications.map((p) => (
            <article key={p.id} className="flex flex-col rounded-2xl border border-line bg-card p-5">
              <span className="mb-2 inline-flex w-fit rounded-full bg-mint px-2.5 py-0.5 text-xs font-semibold text-green">
                {p.category}
              </span>
              <h2 className="text-sm font-bold text-heading text-balance">{p.title}</h2>
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
    </div>
  )
}

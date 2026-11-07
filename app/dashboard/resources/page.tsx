import { redirect } from "next/navigation"
import { Download, FileText } from "lucide-react"
import { getSession } from "@/lib/session"
import { getDocuments } from "@/app/actions/cms"
import { PageHeading } from "@/components/member/page-heading"

export const metadata = {
  title: "Resources | VAAP Dashboard",
}

export default async function ResourcesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const documents = await getDocuments()

  return (
    <div className="w-full">
      <PageHeading
        title="Resources"
        description="Reference documents, templates, and materials for VAAP members."
      />

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-card p-12 text-center">
          <FileText className="size-8 text-muted-2" />
          <p className="text-sm font-semibold text-heading">No resources yet</p>
          <p className="text-sm text-muted-2">Reference documents will appear here.</p>
        </div>
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
    </div>
  )
}

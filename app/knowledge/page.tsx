import Link from "next/link"
import { ArrowRight, Download, FileText, Lock, Newspaper } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PageHero } from "@/components/page-hero"
import { getHeaderUser } from "@/lib/header-user"
import { getPublications, getDocuments } from "@/app/actions/cms"

export const metadata = {
  title: "Knowledge | VAAP",
  description: "Research, guides, and educational resources on virtual assets in Pakistan.",
}

export default async function KnowledgePage() {
  const [user, publications, documents] = await Promise.all([
    getHeaderUser(),
    getPublications(),
    getDocuments(),
  ])

  return (
    <>
        <SiteHeaderServer active="Knowledge" user={user} />
      <main>
        <PageHero
          eyebrow="Knowledge Hub"
          title="Research, guides & education"
          description="Building a better-informed ecosystem through accessible knowledge and research on virtual assets."
        />

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-green">Publications</p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-heading">Research & position papers</h2>
            </div>
            <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:text-green-hover">
              <Newspaper className="size-4" /> Newsroom
            </Link>
          </div>

          {publications.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
              Publications will appear here once released.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publications.map((p) => (
                <article
                  key={p.id as number}
                  className="flex flex-col rounded-xl border border-line bg-card p-6 transition-all hover:-translate-y-1 hover:border-green-border hover:shadow-[0_16px_36px_-20px_rgba(0,168,107,0.5)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-green">
                      {p.category as string}
                    </span>
                    {(p.membersOnly as boolean) && <Lock className="size-4 text-muted-2" />}
                  </div>
                  <h3 className="mt-3 font-bold text-heading text-pretty">{p.title as string}</h3>
                  <p className="mt-1.5 flex-1 text-sm text-body line-clamp-3">{p.description as string}</p>
                  {(p.author as string) && <p className="mt-3 text-xs text-muted-2">By {p.author as string}</p>}
                  {(p.pdfUrl as string) ? (
                    <a
                      href={p.pdfUrl as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green"
                    >
                      Read <ArrowRight className="size-4" />
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-line bg-muted/30">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-green">Document Library</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-heading">Governance & policy documents</h2>

            {documents.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
                Documents will appear here once published.
              </p>
            ) : (
              <div className="mt-6 flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                {documents.map((d) => (
                  <div key={d.id as number} className="flex items-center justify-between gap-4 p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
                        <FileText className="size-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-heading">{d.title as string}</p>
                        <p className="text-xs text-muted-2">{d.category as string}</p>
                        {(d.description as string) && (
                          <p className="mt-1 text-sm text-body line-clamp-1">{d.description as string}</p>
                        )}
                      </div>
                    </div>
                    {(d.fileUrl as string) ? (
                      <a
                        href={d.fileUrl as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-green-border px-3 py-2 text-sm font-semibold text-green transition-colors hover:bg-mint"
                      >
                        <Download className="size-4" /> Download
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

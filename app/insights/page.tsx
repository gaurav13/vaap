import Image from "next/image"
import Link from "next/link"
import { ArrowRight, PenSquare } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PageHero } from "@/components/page-hero"
import { getPublishedArticles } from "@/app/actions/articles"
import { getHeaderUser } from "@/lib/header-user"

export const metadata = {
  title: "Insights | VAAP",
  description: "Member insights, research, and analysis from the Virtual Assets Association of Pakistan community.",
}

export default async function InsightsPage() {
  const [posts, user] = await Promise.all([getPublishedArticles(), getHeaderUser()])

  return (
    <>
      <SiteHeaderServer active="Knowledge" user={user} />
      <main>
        <PageHero
          eyebrow="Insights"
          title="Member insights & analysis"
          description="Perspectives on regulation, research, and the virtual asset ecosystem, contributed by VAAP members and committees."
        />

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-card p-10 text-center">
              <PenSquare className="mx-auto size-8 text-muted-2" />
              <p className="mt-3 text-muted-2">No insights have been published yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/insights/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-line bg-card transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(16,42,54,0.45)]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {p.image && (
                      <Image
                        src={p.image || "/placeholder.svg"}
                        alt={p.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-md bg-mint px-2 py-0.5 font-semibold text-green">{p.category}</span>
                      {p.publishedAt && (
                        <span className="text-muted-2">
                          {new Date(p.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-bold leading-snug text-heading text-pretty">{p.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-body">{p.excerpt}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-muted-2">{p.authorName ? `By ${p.authorName}` : ""}</span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green">
                        Read <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

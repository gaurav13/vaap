import { SplitTitle } from "@/components/news/split-title"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { AuthorBox } from "@/components/insights/author-box"
import { getPublishedArticleBySlug } from "@/app/actions/articles"
import { getHeaderUser } from "@/lib/header-user"
import { RichContent } from "@/components/rich-content"
import { getSiteSettings } from "@/lib/site-settings"
import { FollowVaap } from "@/components/follow-vaap"
import { seoMetadata } from "@/lib/seo"
import { articleSubject } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getPublishedArticleBySlug(slug)
  if (!article) return { title: "Insight" }
  return seoMetadata(articleSubject(article))
}

export default async function InsightDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [article, user, { social }] = await Promise.all([
    getPublishedArticleBySlug(slug),
    getHeaderUser(),
    getSiteSettings(),
  ])
  if (!article) notFound()

  const tags = (article.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  return (
    <>
      <SeoJsonLd subject={articleSubject(article)} />
      <SiteHeaderServer active="Knowledge" user={user} />
      <main>
        <header className="mx-auto max-w-6xl px-5 pt-10 lg:px-8 lg:pt-14">
          <Link
            href="/insights"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-2 transition-colors hover:text-green"
          >
            <ArrowLeft className="size-4" /> All insights
          </Link>

          <div
            className={`mt-8 grid grid-cols-1 items-center gap-10 lg:mt-10 lg:gap-12 ${
              article.image ? "lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1.2fr)]" : ""
            }`}
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="rounded-full bg-green px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                  {article.category}
                </span>
                {article.publishedAt && (
                  <>
                    <span className="h-5 w-px bg-line" aria-hidden="true" />
                    <span className="inline-flex items-center gap-2 text-muted-2">
                      <CalendarDays className="size-4" aria-hidden="true" />
                      <time dateTime={new Date(article.publishedAt).toISOString()}>
                        {new Date(article.publishedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    </span>
                  </>
                )}
              </div>

              <SplitTitle title={article.title} />

              <span className="h-1 w-16 rounded-full bg-green" aria-hidden="true" />

              {article.excerpt && (
                <p className="line-clamp-4 text-base leading-relaxed text-body text-pretty">{article.excerpt}</p>
              )}
            </div>

            {article.image && (
              <>
                <span className="hidden h-4/5 w-px self-center bg-line lg:block" aria-hidden="true" />
                <figure className="w-full overflow-hidden rounded-3xl bg-muted shadow-[0_30px_60px_-35px_rgba(16,40,32,0.45)]">
                  <Image
                    src={article.image || "/placeholder.svg"}
                    alt={article.title}
                    width={1600}
                    height={900}
                    priority
                    sizes="(min-width: 1024px) 640px, 100vw"
                    className="block h-auto max-h-[400px] w-full object-contain"
                  />
                </figure>
              </>
            )}
          </div>

          <div className="mt-10 flex flex-col gap-5">
            {article.authorName && (
              <AuthorBox
                authorId={article.authorId}
                authorName={article.authorName}
                authorRole={article.authorRole}
              />
            )}
            <FollowVaap
              social={social}
              variant="dark"
              cta={{ label: "Stay Updated on Digital Finance & Web3", href: "/insights" }}
            />
          </div>
        </header>

        <article className="mx-auto max-w-3xl px-5 pb-14 pt-12 lg:px-8 lg:pb-20">
          <RichContent value={article.content} className="mt-6 [&_h2]:mt-10 [&_h3]:mt-8 [&_p]:mb-5" />

          {tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-2">
                  #{t}
                </span>
              ))}
            </div>
          )}

        </article>
      </main>
      <SiteFooter />
    </>
  )
}

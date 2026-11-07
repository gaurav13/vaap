import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { AuthorBox } from "@/components/insights/author-box"
import { getPublishedArticleBySlug } from "@/app/actions/articles"
import { getHeaderUser } from "@/lib/header-user"
import { sanitizeRichHtml } from "@/lib/html"
import { isHtml } from "@/lib/sanitize"
import { getSiteSettings } from "@/lib/site-settings"
import { FollowVaap } from "@/components/follow-vaap"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getPublishedArticleBySlug(slug)
  if (!article) return { title: "Insight | VAAP" }
  return {
    title: `${article.seoTitle || article.title} | VAAP`,
    description: article.seoDescription || article.excerpt,
  }
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
            className={`mt-6 grid items-center gap-8 lg:gap-10 ${article.image ? "lg:grid-cols-[1.05fr_1fr]" : ""}`}
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4 text-sm">
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

              <h1 className="text-3xl font-bold leading-tight text-heading text-balance lg:text-[2.6rem]">
                {article.title}
              </h1>

              <span className="h-1 w-16 rounded-full bg-green" aria-hidden="true" />

              {article.excerpt && (
                <p className="text-base leading-relaxed text-body text-pretty lg:text-lg">{article.excerpt}</p>
              )}
            </div>

            {article.image && (
              <div className="overflow-hidden rounded-3xl border-4 border-green bg-green shadow-lg">
                <Image
                  src={article.image || "/placeholder.svg"}
                  alt={article.title}
                  width={1600}
                  height={900}
                  priority
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="block h-auto w-full rounded-[1.25rem]"
                />
              </div>
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
          {isHtml(article.content || "") ? (
            <div
              className="mt-6 text-base leading-relaxed text-body text-pretty [&_a]:text-green [&_a]:underline [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-green [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:text-heading [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-heading [&_h4]:mb-2 [&_h4]:mt-6 [&_h4]:font-semibold [&_h4]:text-heading [&_img]:my-6 [&_img]:w-full [&_img]:rounded-xl [&_li]:mb-1 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-5 [&_strong]:font-semibold [&_strong]:text-heading [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&>*:first-child]:mt-0"
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(article.content) }}
            />
          ) : (
            <div className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-body">{article.content}</div>
          )}

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

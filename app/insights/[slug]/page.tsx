import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getPublishedArticleBySlug } from "@/app/actions/articles"
import { getHeaderUser } from "@/lib/header-user"
import { sanitizeRichHtml } from "@/lib/html"
import { isHtml } from "@/lib/sanitize"

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
  const [article, user] = await Promise.all([getPublishedArticleBySlug(slug), getHeaderUser()])
  if (!article) notFound()

  const tags = (article.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  return (
    <>
      <SiteHeaderServer active="Knowledge" user={user} />
      <main>
        <article className="mx-auto max-w-3xl px-5 py-14 lg:px-8 lg:py-20">
          <Link
            href="/insights"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-2 transition-colors hover:text-green"
          >
            <ArrowLeft className="size-4" /> All insights
          </Link>

          <div className="mt-6 flex items-center gap-2 text-xs">
            <span className="rounded-md bg-mint px-2 py-0.5 font-semibold text-green">{article.category}</span>
            {article.publishedAt && (
              <span className="text-muted-2">
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight text-heading text-balance lg:text-4xl">
            {article.title}
          </h1>

          {article.authorName && (
            <p className="mt-3 text-sm text-muted-2">
              By <span className="font-semibold text-heading">{article.authorName}</span>
            </p>
          )}

          {article.image && (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
              <Image src={article.image || "/placeholder.svg"} alt={article.title} fill className="object-cover" />
            </div>
          )}

          {article.excerpt && (
            <p className="mt-8 text-lg font-medium leading-relaxed text-body text-pretty">{article.excerpt}</p>
          )}

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

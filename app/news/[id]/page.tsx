import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { db } from "@/lib/db"
import { news } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { getSiteSettings } from "@/lib/site-settings"
import { FollowVaap } from "@/components/follow-vaap"
import { PublisherCredit, PublisherInfo } from "@/components/news/publisher-info"

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) notFound()

  const [post] = await db
    .select()
    .from(news)
    .where(and(eq(news.id, numericId), eq(news.published, true)))
    .limit(1)

  if (!post) notFound()

  const [user, { social }] = await Promise.all([getHeaderUser(), getSiteSettings()])
  const createdAt = new Date(post.createdAt)
  const publisher =
    post.publisherName && post.externalUrl
      ? {
          name: post.publisherName,
          logo: post.publisherLogo,
          url: post.externalUrl,
          publishedAt: post.originalPublishedAt,
        }
      : null

  return (
    <>
      <SiteHeaderServer active="Knowledge" user={user} />
      <main>
        <header className="mx-auto max-w-6xl px-5 pt-10 lg:px-8 lg:pt-14">
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-2 transition-colors hover:text-green"
          >
            <ArrowLeft className="size-4" /> Back to News
          </Link>

          <div
            className={`mt-8 grid grid-cols-1 items-center gap-10 lg:mt-10 lg:gap-14 ${
              post.image ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" : ""
            }`}
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="rounded-full bg-green px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                  {post.category}
                </span>
                <span className="h-5 w-px bg-line" aria-hidden="true" />
                <span className="inline-flex items-center gap-2 text-muted-2">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  <time dateTime={createdAt.toISOString()}>
                    {createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </time>
                </span>
              </div>

              <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-heading text-balance md:text-4xl lg:text-[2.6rem]">
                {post.title}
              </h1>

              <span className="h-1 w-16 rounded-full bg-green" aria-hidden="true" />

              {publisher && <PublisherCredit {...publisher} />}
            </div>

            {post.image && (
              <figure className="w-full overflow-hidden rounded-2xl bg-card p-2 shadow-[0_24px_48px_-30px_rgba(16,40,32,0.35)] ring-1 ring-line">
                <Image
                  src={post.image || "/placeholder.svg"}
                  alt={post.title}
                  width={1600}
                  height={900}
                  priority
                  sizes="(min-width: 1024px) 600px, 100vw"
                  className="block h-auto max-h-[380px] w-full rounded-xl object-contain"
                />
              </figure>
            )}
          </div>

          <div className="mt-10">
            <FollowVaap
              social={social}
              variant="dark"
              cta={{ label: "Stay Updated on Digital Finance & Web3", href: "/news" }}
            />
          </div>
        </header>

        <article className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-14 pt-12 lg:px-8 lg:pb-20">
          {post.excerpt?.trim() && (
            <p className="border-l-4 border-green pl-5 text-pretty text-lg font-medium leading-relaxed text-heading">
              {post.excerpt.trim()}
            </p>
          )}
          {post.content && (
            <div className="flex flex-col gap-3">
              {publisher && (
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-2">Summary</h2>
              )}
              <div className="whitespace-pre-line text-pretty text-base leading-relaxed text-body">{post.content}</div>
            </div>
          )}
          {publisher && <PublisherInfo {...publisher} />}
        </article>
      </main>
      <SiteFooter />
    </>
  )
}

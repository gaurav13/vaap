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

          <div className={`mt-6 grid items-center gap-8 lg:gap-10 ${post.image ? "lg:grid-cols-[1.05fr_1fr]" : ""}`}>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4 text-sm">
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

              <h1 className="text-3xl font-bold leading-tight text-heading text-balance lg:text-[2.6rem]">
                {post.title}
              </h1>

              <span className="h-1 w-16 rounded-full bg-green" aria-hidden="true" />

              {post.excerpt && (
                <p className="text-base leading-relaxed text-body text-pretty lg:text-lg">{post.excerpt}</p>
              )}
            </div>

            {post.image && (
              <div
                className="relative aspect-[16/11] overflow-hidden rounded-3xl bg-green shadow-lg"
                style={{ clipPath: "polygon(14% 0, 100% 0, 100% 100%, 0 100%)" }}
              >
                <div
                  className="absolute inset-0"
                  style={{ clipPath: "polygon(calc(14% + 8px) 0, 100% 0, 100% 100%, 8px 100%)" }}
                >
                  <Image
                    src={post.image || "/placeholder.svg"}
                    alt={post.title}
                    fill
                    priority
                    sizes="(min-width: 1024px) 560px, 100vw"
                    className="object-cover"
                  />
                </div>
              </div>
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

        <article className="mx-auto max-w-3xl px-5 pb-14 pt-12 lg:px-8 lg:pb-20">
          {post.content && (
            <div className="whitespace-pre-line text-pretty text-base leading-relaxed text-body">{post.content}</div>
          )}
        </article>
      </main>
      <SiteFooter />
    </>
  )
}

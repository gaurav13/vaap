import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { news } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"

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

  const user = await getHeaderUser()

  return (
    <>
        <SiteHeaderServer active="Knowledge" user={user} />
      <main className="mx-auto max-w-3xl px-5 py-12 lg:px-8 lg:py-16">
        <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:text-green-hover">
          <ArrowLeft className="size-4" /> Back to News
        </Link>

        <div className="mt-6 flex items-center gap-2 text-xs">
          <span className="rounded-md bg-mint px-2 py-0.5 font-semibold text-green">{post.category}</span>
          <span className="text-muted-2">
            {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <h1 className="mt-4 text-balance font-serif text-3xl font-bold leading-tight text-heading lg:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-body">{post.excerpt}</p>

        {post.image && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
            <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
          </div>
        )}

        {post.content && (
          <div className="mt-8 whitespace-pre-line text-pretty leading-relaxed text-body">{post.content}</div>
        )}
      </main>
      <SiteFooter />
    </>
  )
}

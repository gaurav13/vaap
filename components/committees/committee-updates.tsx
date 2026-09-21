import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

type Post = {
  id: number
  title: string
  excerpt: string
  image: string | null
  committeeName: string | null
  createdAt: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function CommitteeUpdates({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null

  return (
    <section className="bg-mint-2">
      <div className="vaap-container py-12 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-green" aria-hidden="true" />
              <span className="text-xs font-semibold tracking-[0.2em] text-green">COMMITTEE NEWS</span>
            </div>
            <h2 className="mt-3 font-serif text-3xl font-bold text-heading lg:text-4xl">Latest Updates</h2>
          </div>
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-sm font-semibold text-green transition-colors hover:text-green-dark"
          >
            View All News
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="flex flex-col overflow-hidden rounded-xl border border-line-light bg-surface"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-mint">
                {post.image ? (
                  <Image
                    src={post.image || "/placeholder.svg"}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs text-muted-2">
                  {formatDate(post.createdAt)}
                  {post.committeeName ? (
                    <>
                      {"  |  "}
                      <span className="font-semibold text-green">{post.committeeName}</span>
                    </>
                  ) : null}
                </p>
                <h3 className="mt-2 font-serif text-lg font-bold leading-snug text-heading text-balance">
                  {post.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-2">{post.excerpt}</p>
                <Link
                  href={`/news/${post.id}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-green transition-colors hover:text-green-dark"
                >
                  Read More
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

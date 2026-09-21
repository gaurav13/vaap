import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { getArticleReviewQueue } from "@/app/actions/articles"
import { ArticleReview } from "@/components/admin/article-review"

export const metadata = {
  title: "Articles | VAAP Admin",
}

export default async function AdminArticlesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  if (!can(session.user.role, "articles.publish")) redirect("/admin")

  const queue = await getArticleReviewQueue()

  return (
    <ArticleReview
      initial={queue.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        category: a.category,
        excerpt: a.excerpt,
        content: a.content,
        authorName: a.authorName,
        authorRole: a.authorRole,
        image: a.image,
        status: a.status,
        updatedAt: a.updatedAt.toISOString(),
        publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      }))}
    />
  )
}

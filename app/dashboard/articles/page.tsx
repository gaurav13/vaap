import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { getMyArticles } from "@/app/actions/articles"
import { ArticlesWorkspace } from "@/components/member/articles-workspace"

export const metadata = {
  title: "Articles | VAAP Dashboard",
}

export default async function DashboardArticlesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  if (!can(session.user.role, "articles.create")) {
    redirect("/dashboard")
  }

  const articles = await getMyArticles()
  const canPublish = can(session.user.role, "articles.publish")

  return (
    <div className="mx-auto w-full max-w-6xl">
      <ArticlesWorkspace
        initialArticles={articles.map((a) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          category: a.category,
          excerpt: a.excerpt,
          content: a.content,
          tags: a.tags,
          image: a.image,
          seoTitle: a.seoTitle,
          seoDescription: a.seoDescription,
          status: a.status,
          updatedAt: a.updatedAt.toISOString(),
        }))}
        canPublish={canPublish}
      />
    </div>
  )
}

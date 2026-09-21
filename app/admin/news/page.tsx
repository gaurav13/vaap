import { db } from "@/lib/db"
import { news, committees } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { NewsManager } from "@/components/admin/news-manager"

export default async function AdminNewsPage() {
  const [rows, committeeRows] = await Promise.all([
    db.select().from(news).orderBy(desc(news.createdAt)),
    db.select({ id: committees.id, name: committees.name }).from(committees).orderBy(committees.sortOrder),
  ])
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">News</h1>
      <p className="mt-1 text-muted-2">Create, edit, and publish news articles.</p>
      <NewsManager
        committees={committeeRows}
        items={rows.map((r) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          excerpt: r.excerpt,
          content: r.content,
          image: r.image,
          committeeId: r.committeeId,
          published: r.published,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}

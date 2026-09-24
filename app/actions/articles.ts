"use server"

import { db } from "@/lib/db"
import { articles, articleApprovals, notifications } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { and, desc, eq, inArray, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
}

async function requireAuthor() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (!can(session.user.role, "articles.create")) throw new Error("Forbidden")
  return session.user
}

async function requirePublisher() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  if (!can(session.user.role, "articles.publish")) throw new Error("Forbidden")
  return session.user
}

// ---- Author-facing --------------------------------------------------------

export async function getMyArticles() {
  const me = await requireAuthor()
  const rows = await db
    .select()
    .from(articles)
    .where(eq(articles.authorId, me.id))
    .orderBy(desc(articles.updatedAt))
  return rows
}

async function uniqueSlug(base: string, ignoreId?: number): Promise<string> {
  const root = slugify(base) || "article"
  let candidate = root
  let n = 1
  // Loop until no other article uses the slug.
  // Cap iterations to avoid an unbounded loop.
  while (n < 100) {
    const clash = await db
      .select({ id: articles.id })
      .from(articles)
      .where(ignoreId ? and(eq(articles.slug, candidate), ne(articles.id, ignoreId)) : eq(articles.slug, candidate))
      .limit(1)
    if (clash.length === 0) return candidate
    n += 1
    candidate = `${root}-${n}`
  }
  return `${root}-${Date.now()}`
}

export async function saveArticleDraft(input: {
  id?: number
  title: string
  category: string
  excerpt: string
  content: string
  tags: string
  image?: string
  seoTitle?: string
  seoDescription?: string
}) {
  const me = await requireAuthor()
  const title = input.title.trim()
  if (!title) return { ok: false as const, error: "Title is required." }
  if (!input.content.trim()) return { ok: false as const, error: "Content cannot be empty." }

  if (input.id) {
    const [existing] = await db.select().from(articles).where(eq(articles.id, input.id)).limit(1)
    if (!existing) return { ok: false as const, error: "Article not found." }
    if (existing.authorId !== me.id && !can(me.role, "articles.publish")) {
      return { ok: false as const, error: "You can only edit your own drafts." }
    }
    if (["published"].includes(existing.status) && !can(me.role, "articles.publish")) {
      return { ok: false as const, error: "Published articles can only be edited by an editor." }
    }
    await db
      .update(articles)
      .set({
        title,
        category: input.category || "Insight",
        excerpt: input.excerpt.trim(),
        content: input.content,
        tags: input.tags.trim(),
        image: input.image?.trim() || null,
        seoTitle: input.seoTitle?.trim() ?? "",
        seoDescription: input.seoDescription?.trim() ?? "",
        updatedAt: new Date(),
      })
      .where(eq(articles.id, input.id))
    revalidatePath("/dashboard/articles")
    return { ok: true as const, id: input.id }
  }

  const slug = await uniqueSlug(title)
  const [created] = await db
    .insert(articles)
    .values({
      title,
      slug,
      category: input.category || "Insight",
      excerpt: input.excerpt.trim(),
      content: input.content,
      tags: input.tags.trim(),
      image: input.image?.trim() || null,
      authorId: me.id,
      authorName: me.name ?? "",
      authorRole: me.role,
      seoTitle: input.seoTitle?.trim() ?? "",
      seoDescription: input.seoDescription?.trim() ?? "",
      status: "draft",
    })
    .returning({ id: articles.id })
  revalidatePath("/dashboard/articles")
  return { ok: true as const, id: created.id }
}

export async function submitArticle(id: number) {
  const me = await requireAuthor()
  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
  if (!article) return { ok: false as const, error: "Article not found." }
  if (article.authorId !== me.id) return { ok: false as const, error: "You can only submit your own articles." }
  if (!["draft", "changes_requested"].includes(article.status)) {
    return { ok: false as const, error: `Article is already ${article.status}.` }
  }
  await db.update(articles).set({ status: "submitted", updatedAt: new Date() }).where(eq(articles.id, id))
  await db.insert(articleApprovals).values({
    articleId: id,
    reviewerId: me.id,
    reviewerName: me.name ?? "",
    decision: "submitted",
    note: "Submitted for review",
  })
  // Notify editors (broadcast to admin role).
  await db.insert(notifications).values({
    role: "admin",
    type: "article",
    title: "Article submitted for review",
    body: `${me.name ?? "A contributor"} submitted "${article.title}".`,
    link: "/admin/articles",
  })
  revalidatePath("/dashboard/articles")
  revalidatePath("/admin/articles")
  return { ok: true as const }
}

export async function getArticleTimeline(id: number) {
  await requireAuthor()
  return db
    .select()
    .from(articleApprovals)
    .where(eq(articleApprovals.articleId, id))
    .orderBy(desc(articleApprovals.createdAt))
}

// ---- Editor / publisher facing -------------------------------------------

export async function createAdminArticle(input: {
  title: string
  category: string
  excerpt: string
  content: string
  tags: string
  image?: string
  published: boolean
}) {
  const me = await requirePublisher()
  const title = input.title.trim()
  if (!title) return { ok: false as const, error: "Title is required." }
  if (!input.content.trim()) return { ok: false as const, error: "Content cannot be empty." }

  const slug = await uniqueSlug(title)
  const published = input.published
  const now = new Date()
  const [created] = await db
    .insert(articles)
    .values({
      title,
      slug,
      category: input.category.trim() || "Insight",
      excerpt: input.excerpt.trim(),
      content: input.content,
      tags: input.tags.trim(),
      image: input.image?.trim() || null,
      authorId: me.id,
      authorName: me.name ?? "",
      authorRole: me.role,
      status: published ? "published" : "approved",
      publishedAt: published ? now : null,
    })
    .returning()

  await db.insert(articleApprovals).values({
    articleId: created.id,
    reviewerId: me.id,
    reviewerName: me.name ?? "",
    decision: published ? "published" : "approved",
    note: published ? "Created and published from admin" : "Created from admin",
  })

  revalidatePath("/admin/articles")
  revalidatePath("/insights")
  if (published) revalidatePath(`/insights/${slug}`)
  return {
    ok: true as const,
    article: {
      id: created.id,
      title: created.title,
      slug: created.slug,
      category: created.category,
      excerpt: created.excerpt,
      content: created.content,
      authorName: created.authorName,
      authorRole: created.authorRole,
      image: created.image,
      status: created.status,
      updatedAt: created.updatedAt.toISOString(),
      publishedAt: created.publishedAt ? created.publishedAt.toISOString() : null,
    },
  }
}

export async function getArticleReviewQueue() {
  await requirePublisher()
  const rows = await db
    .select()
    .from(articles)
    .where(inArray(articles.status, ["submitted", "approved", "changes_requested", "published"]))
    .orderBy(desc(articles.updatedAt))
    .limit(200)
  return rows
}

export async function reviewArticle(input: {
  id: number
  decision: "approved" | "changes_requested" | "rejected"
  note?: string
}) {
  const me = await requirePublisher()
  const [article] = await db.select().from(articles).where(eq(articles.id, input.id)).limit(1)
  if (!article) return { ok: false as const, error: "Article not found." }

  const nextStatus =
    input.decision === "approved" ? "approved" : input.decision === "rejected" ? "rejected" : "changes_requested"

  await db.update(articles).set({ status: nextStatus, updatedAt: new Date() }).where(eq(articles.id, input.id))
  await db.insert(articleApprovals).values({
    articleId: input.id,
    reviewerId: me.id,
    reviewerName: me.name ?? "",
    decision: input.decision,
    note: input.note ?? "",
  })
  if (article.authorId) {
    await db.insert(notifications).values({
      userId: article.authorId,
      type: "article",
      title: `Article ${input.decision.replace(/_/g, " ")}`,
      body:
        input.decision === "approved"
          ? `"${article.title}" was approved and is ready to publish.`
          : input.decision === "rejected"
            ? `"${article.title}" was rejected. ${input.note ?? ""}`.trim()
            : `Changes requested on "${article.title}". ${input.note ?? ""}`.trim(),
      link: "/dashboard/articles",
    })
  }
  revalidatePath("/admin/articles")
  revalidatePath("/dashboard/articles")
  return { ok: true as const }
}

export async function publishArticle(id: number) {
  const me = await requirePublisher()
  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
  if (!article) return { ok: false as const, error: "Article not found." }
  if (article.status !== "approved" && article.status !== "submitted") {
    return { ok: false as const, error: "Only approved articles can be published." }
  }
  await db
    .update(articles)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(articles.id, id))
  await db.insert(articleApprovals).values({
    articleId: id,
    reviewerId: me.id,
    reviewerName: me.name ?? "",
    decision: "published",
    note: "Published to the public site",
  })
  if (article.authorId) {
    await db.insert(notifications).values({
      userId: article.authorId,
      type: "article",
      title: "Article published",
      body: `"${article.title}" is now live on the VAAP insights page.`,
      link: `/insights/${article.slug}`,
    })
  }
  revalidatePath("/admin/articles")
  revalidatePath("/dashboard/articles")
  revalidatePath("/insights")
  return { ok: true as const }
}

export async function unpublishArticle(id: number) {
  await requirePublisher()
  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
  if (!article) return { ok: false as const, error: "Article not found." }
  await db.update(articles).set({ status: "approved", updatedAt: new Date() }).where(eq(articles.id, id))
  revalidatePath("/admin/articles")
  revalidatePath("/insights")
  return { ok: true as const }
  }

// ---- Public ---------------------------------------------------------------

export async function getPublishedArticles() {
  return db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      category: articles.category,
      image: articles.image,
      excerpt: articles.excerpt,
      authorName: articles.authorName,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
}

export async function getPublishedArticleBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1)
  return row ?? null
}

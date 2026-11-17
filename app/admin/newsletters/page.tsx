import { desc, isNotNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { members, newsletterCampaigns, newsletterSubscribers } from "@/lib/db/schema"
import { describeAudience, dailySendLimit } from "@/lib/newsletter/engine"
import { NewsletterManager } from "@/components/admin/newsletter-manager"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function AdminNewslettersPage() {
  const session = await getSession()
  const canSend = session?.user?.role === "admin" || session?.user?.role === "manager"

  const [campaigns, subscribers, categoryRows] = await Promise.all([
    db.select().from(newsletterCampaigns).orderBy(desc(newsletterCampaigns.updatedAt)).limit(100),
    db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(200),
    db
      .selectDistinct({ category: members.category })
      .from(members)
      .where(isNotNull(members.category))
      .orderBy(sql`1`),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-heading">Newsletters</h1>
        <p className="mt-1 text-pretty text-muted-2">
          Write, preview and send newsletters to members and opted-in contacts. Sending is queued and throttled to {dailySendLimit().toLocaleString()} emails per day, with automatic retries, bounce suppression and one-click unsubscribe.
        </p>
      </div>
      <NewsletterManager
        canSend={canSend}
        categories={categoryRows.map((r) => r.category).filter((c): c is string => Boolean(c))}
        campaigns={campaigns.map((c) => ({
          id: c.id,
          title: c.title,
          subject: c.subject,
          previewText: c.previewText,
          bannerUrl: c.bannerUrl,
          bodyHtml: c.bodyHtml,
          ctaLabel: c.ctaLabel,
          ctaUrl: c.ctaUrl,
          audience: c.audience,
          audienceLabel: describeAudience(c.audience),
          status: c.status,
          scheduledAt: c.scheduledAt?.toISOString() ?? null,
          completedAt: c.completedAt?.toISOString() ?? null,
          totalRecipients: c.totalRecipients,
          updatedByName: c.updatedByName,
          updatedAt: c.updatedAt.toISOString(),
        }))}
        subscribers={subscribers.map((s) => ({ id: s.id, email: s.email, name: s.name, status: s.status, source: s.source, createdAt: s.createdAt.toISOString() }))}
      />
    </div>
  )
}

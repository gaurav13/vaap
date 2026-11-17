import { desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { newsletterSubscribers } from "@/lib/db/schema"
import { dailySendLimit } from "@/lib/newsletter/engine"
import { loadEditable, loadHistory, loadPlans } from "@/lib/newsletter/admin-data"
import { NewsletterManager } from "@/components/admin/newsletter-manager"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function AdminNewslettersPage() {
  const session = await getSession()
  const canSend = session?.user?.role === "admin" || session?.user?.role === "manager"

  const [drafts, history, plans, subscribers] = await Promise.all([
    loadEditable("newsletter"),
    loadHistory(),
    loadPlans(),
    db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(200),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-heading">Newsletters</h1>
        <p className="mt-1 text-pretty leading-relaxed text-muted-2">
          Write, preview and send newsletters to the exact groups you choose. Recipients are counted and de-duplicated before sending, and anyone who unsubscribed is skipped. Sending is throttled to {dailySendLimit().toLocaleString()} emails per day.
        </p>
      </div>
      <NewsletterManager
        canSend={canSend}
        drafts={drafts}
        history={history.filter((h) => h.kind === "newsletter")}
        plans={plans}
        subscribers={subscribers.map((s) => ({ id: s.id, email: s.email, name: s.name, status: s.status, source: s.source, createdAt: s.createdAt.toISOString() }))}
      />
    </div>
  )
}

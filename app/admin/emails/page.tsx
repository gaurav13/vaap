import Link from "next/link"
import { redirect } from "next/navigation"
import { gte, sql } from "drizzle-orm"
import { ArrowRight, Mail, Zap } from "lucide-react"
import { db } from "@/lib/db"
import { emailLogs, emailTemplates } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { EMAIL_TEMPLATES } from "@/lib/email-templates/registry"
import { EmailTabs } from "@/components/admin/email-tabs"

export const metadata = { title: "Email Templates | VAAP Admin" }

async function loadData() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  try {
    const [rows, stats] = await Promise.all([
      db.select().from(emailTemplates),
      db
        .select({
          key: emailLogs.templateKey,
          sent: sql<number>`count(*) filter (where ${emailLogs.status} = 'sent' and not ${emailLogs.isTest})`,
          failed: sql<number>`count(*) filter (where ${emailLogs.status} = 'failed' and not ${emailLogs.isTest})`,
        })
        .from(emailLogs)
        .where(gte(emailLogs.createdAt, since))
        .groupBy(emailLogs.templateKey),
    ])
    return { rows, stats }
  } catch {
    return { rows: [], stats: [] }
  }
}

function StatusBadge({ label, tone }: { label: string; tone: "live" | "draft" | "default" }) {
  const styles = {
    live: "bg-mint text-green",
    draft: "bg-gold-tint text-heading",
    default: "bg-surface text-muted-2",
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{label}</span>
}

export default async function AdminEmailsPage() {
  const session = await getSession()
  if (session?.user?.role !== "admin") redirect("/admin")

  const { rows, stats } = await loadData()
  const byKey = new Map(rows.map((r) => [r.key, r]))
  const statsByKey = new Map(stats.map((s) => [s.key, s]))
  const categories = Array.from(new Set(EMAIL_TEMPLATES.map((t) => t.category)))

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Email Templates</h1>
      <p className="mt-1 max-w-2xl text-pretty leading-relaxed text-muted-2">
        Every automated email the website sends. Edits are saved as drafts and only reach members after you publish.
      </p>

      <EmailTabs active="templates" />

      <div className="mt-8 flex flex-col gap-10">
        {categories.map((category) => (
          <section key={category} aria-labelledby={`cat-${category}`}>
            <h2 id={`cat-${category}`} className="text-xs font-bold uppercase tracking-widest text-muted-2">
              {category}
            </h2>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {EMAIL_TEMPLATES.filter((t) => t.category === category).map((t) => {
                const row = byKey.get(t.key)
                const subject = row?.publishedContent?.subject || t.defaults.subject
                const s = statsByKey.get(t.key)
                const hasDraft = Boolean(row?.draftContent)
                const version = row?.publishedVersion ?? 0
                return (
                  <li key={t.key}>
                    <Link
                      href={`/admin/emails/${encodeURIComponent(t.key)}`}
                      className="group flex h-full flex-col rounded-xl border border-line bg-card p-5 transition-colors hover:border-green-border"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
                          <Mail className="size-4" aria-hidden="true" />
                        </span>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {hasDraft && <StatusBadge label="Unpublished draft" tone="draft" />}
                          <StatusBadge label={version > 0 ? `Live · v${version}` : "Live · Default"} tone={version > 0 ? "live" : "default"} />
                        </div>
                      </div>
                      <h3 className="mt-4 text-base font-bold text-heading">{t.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-body">
                        <span className="sr-only">Subject: </span>
                        {subject}
                      </p>
                      <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted-2">
                        <Zap className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        <span>{t.trigger}</span>
                      </p>
                      <div className="mt-auto flex items-center justify-between border-t border-line-light pt-3 text-xs">
                        <span className="text-muted-2">
                          {Number(s?.sent ?? 0)} sent
                          {Number(s?.failed ?? 0) > 0 && <span className="text-destructive"> · {Number(s?.failed)} failed</span>}
                          <span> · 30 days</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-green">
                          Edit
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

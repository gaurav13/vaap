import Link from "next/link"
import { redirect } from "next/navigation"
import { and, desc, eq, gte, ilike, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { emailLogs } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { EMAIL_TEMPLATES, getTemplateDefinition } from "@/lib/email-templates/registry"
import { EmailTabs } from "@/components/admin/email-tabs"
import { cn } from "@/lib/utils"

export const metadata = { title: "Email Logs | VAAP Admin" }

const PAGE_SIZE = 50
const STATUSES = ["all", "sent", "failed", "skipped"] as const

type SearchParams = Promise<{ status?: string; template?: string; q?: string; page?: string }>

export default async function AdminEmailLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (session?.user?.role !== "admin") redirect("/admin")

  const params = await searchParams
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number]) ? params.status! : "all"
  const template = params.template && getTemplateDefinition(params.template) ? params.template : ""
  const q = (params.q ?? "").trim().slice(0, 120)
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)

  const filters: SQL[] = []
  if (status !== "all") filters.push(eq(emailLogs.status, status))
  if (template) filters.push(eq(emailLogs.templateKey, template))
  if (q) filters.push(ilike(emailLogs.recipient, `%${q.replace(/[%_\\]/g, "\\$&")}%`))
  const where = filters.length ? and(...filters) : undefined

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let rows: (typeof emailLogs.$inferSelect)[] = []
  let total = 0
  let summary = { sent: 0, failed: 0, skipped: 0 }
  try {
    const [list, [count], [sum]] = await Promise.all([
      db.select().from(emailLogs).where(where).orderBy(desc(emailLogs.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
      db.select({ n: sql<number>`count(*)` }).from(emailLogs).where(where),
      db
        .select({
          sent: sql<number>`count(*) filter (where ${emailLogs.status} = 'sent')`,
          failed: sql<number>`count(*) filter (where ${emailLogs.status} = 'failed')`,
          skipped: sql<number>`count(*) filter (where ${emailLogs.status} = 'skipped')`,
        })
        .from(emailLogs)
        .where(gte(emailLogs.createdAt, since)),
    ])
    rows = list
    total = Number(count?.n ?? 0)
    summary = { sent: Number(sum?.sent ?? 0), failed: Number(sum?.failed ?? 0), skipped: Number(sum?.skipped ?? 0) }
  } catch {
    // table unavailable: show empty state
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const href = (overrides: Record<string, string | number>) => {
    const sp = new URLSearchParams()
    const merged = { status, template, q, page: 1, ...overrides }
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "status" && v === "all") && !(k === "page" && v === 1)) sp.set(k, String(v))
    const s = sp.toString()
    return `/admin/emails/logs${s ? `?${s}` : ""}`
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Email Templates</h1>
      <p className="mt-1 max-w-2xl text-pretty leading-relaxed text-muted-2">
        Delivery history for every email the website sends, including tests.
      </p>
      <EmailTabs active="logs" />

      <dl className="mt-6 grid grid-cols-3 gap-4 sm:max-w-xl">
        {[
          { label: "Delivered", value: summary.sent, tone: "text-green" },
          { label: "Failed", value: summary.failed, tone: "text-destructive" },
          { label: "Skipped", value: summary.skipped, tone: "text-muted-2" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-card p-4">
            <dt className="text-xs font-semibold text-muted-2">{s.label} · 30 days</dt>
            <dd className={cn("mt-1 text-2xl font-bold tabular-nums", s.tone)}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <form method="get" action="/admin/emails/logs" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-2">
          Status
          <select name="status" defaultValue={status} className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-body">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-2">
          Template
          <select name="template" defaultValue={template} className="h-10 rounded-lg border border-line bg-card px-3 text-sm text-body">
            <option value="">All templates</option>
            {EMAIL_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted-2">
          Recipient
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email"
            className="h-10 w-56 rounded-lg border border-line bg-card px-3 text-sm text-body"
          />
        </label>
        <button type="submit" className="h-10 rounded-lg bg-green px-4 text-sm font-semibold text-white hover:bg-green-hover">
          Filter
        </button>
        {(status !== "all" || template || q) && (
          <Link href="/admin/emails/logs" className="h-10 content-center px-2 text-sm font-semibold text-muted-2 hover:text-heading">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted-2">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Time</th>
              <th scope="col" className="px-4 py-3 font-semibold">Template</th>
              <th scope="col" className="px-4 py-3 font-semibold">Recipient</th>
              <th scope="col" className="px-4 py-3 font-semibold">Subject</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-light">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-2">
                  No emails match these filters yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-2">
                    {r.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" })}
                  </td>
                  <td className="px-4 py-3 text-body">
                    {r.templateKey ? getTemplateDefinition(r.templateKey)?.name ?? r.templateKey : "System"}
                    {r.isTest && <span className="ml-2 rounded bg-blue-tint px-1.5 py-0.5 text-xs font-semibold text-heading">Test</span>}
                  </td>
                  <td className="px-4 py-3 text-body">{r.recipient}</td>
                  <td className="max-w-xs px-4 py-3 text-body">
                    <span className="line-clamp-1">{r.subject}</span>
                    {r.error && <span className="mt-1 block text-xs text-destructive">{r.error}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        r.status === "sent" && "bg-mint text-green",
                        r.status === "failed" && "bg-destructive/10 text-destructive",
                        r.status === "skipped" && "bg-surface text-muted-2",
                      )}
                    >
                      {r.status === "sent" ? "Delivered" : r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-2">
            Page {page} of {pages} · {total} emails
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={href({ page: page - 1 })} className="rounded-lg border border-line px-3 py-1.5 font-semibold text-body hover:bg-mint">
                Previous
              </Link>
            )}
            {page < pages && (
              <Link href={href({ page: page + 1 })} className="rounded-lg border border-line px-3 py-1.5 font-semibold text-body hover:bg-mint">
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}

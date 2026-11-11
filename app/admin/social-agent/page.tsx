import Link from "next/link"
import { redirect } from "next/navigation"
import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { auditLogs, socialAccounts, socialPosts, socialTemplates } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import { CATEGORIES, POST_STATUSES, categoryLabel, isCategoryKey, type CategoryKey } from "@/lib/social-agent/config"
import { getAllRules, getAutomation } from "@/lib/social-agent/service"
import { getSourceRecords } from "@/lib/social-agent/sources"
import { TemplateLibrary } from "@/components/admin/social-agent/template-library"
import { TemplateEditor } from "@/components/admin/social-agent/template-editor"
import { CategoryRulesList } from "@/components/admin/social-agent/category-rules"
import { GenerateStudio } from "@/components/admin/social-agent/generate-studio"
import { PostCard, type AgentPost } from "@/components/admin/social-agent/post-card"
import { AccountsPanel, AutomationPanel } from "@/components/admin/social-agent/settings-panels"

export const metadata = { title: "AI Social Media Agent" }

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "templates", label: "Templates" },
  { key: "categories", label: "Categories" },
  { key: "generate", label: "Generate" },
  { key: "approvals", label: "Approvals" },
  { key: "scheduled", label: "Approved & Scheduled" },
  { key: "published", label: "Published" },
  { key: "accounts", label: "Accounts" },
  { key: "automation", label: "Automation" },
  { key: "activity", label: "Activity Log" },
] as const

type Tab = (typeof TABS)[number]["key"]

function toPost(p: typeof socialPosts.$inferSelect): AgentPost {
  return {
    ...p,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    updatedAt: p.updatedAt.toISOString(),
  }
}

async function postsWith(statuses: string[]) {
  const rows = await db.select().from(socialPosts).where(inArray(socialPosts.status, statuses)).orderBy(desc(socialPosts.updatedAt)).limit(100)
  return rows.map(toPost)
}

export default async function SocialAgentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await getSession()
  // Super Admin only: Staff and Admin never see or reach this module.
  if (session?.user?.role !== "admin") redirect("/admin")

  const params = await searchParams
  const tab: Tab = TABS.some((t) => t.key === params.tab) ? (params.tab as Tab) : "overview"
  const focusPost = Number(params.post) || null

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-serif text-2xl font-bold text-heading">AI Social Media Agent</h1>
        <p className="mt-1 text-muted-2">
          Turns approved website records into on-brand banners and captions. Every post waits for Super Admin approval before it goes out.
        </p>
      </header>
      <nav aria-label="Social agent sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/social-agent?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium",
              t.key === tab ? "border-green text-green" : "border-transparent text-muted-2 hover:text-heading",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <TabContent tab={tab} params={params} focusPost={focusPost} />
    </div>
  )
}

async function TabContent({ tab, params, focusPost }: { tab: Tab; params: Record<string, string | undefined>; focusPost: number | null }) {
  switch (tab) {
    case "overview":
      return <Overview />
    case "templates": {
      const templates = (await db.select().from(socialTemplates).orderBy(desc(socialTemplates.updatedAt))).map((t) => ({
        id: t.id,
        category: t.category,
        name: t.name,
        imageUrl: t.imageUrl,
        width: t.width,
        height: t.height,
        layers: t.layers,
        active: t.active,
      }))
      const editing = templates.find((t) => t.id === Number(params.edit))
      if (editing && isCategoryKey(editing.category)) {
        const records = (await getSourceRecords(editing.category)).map((r) => ({ id: r.sourceId, title: r.title }))
        return <TemplateEditor key={editing.id} template={editing} records={records} />
      }
      return <TemplateLibrary templates={templates} />
    }
    case "categories": {
      const [rules, active] = await Promise.all([
        getAllRules(),
        db.select({ category: socialTemplates.category }).from(socialTemplates).where(eq(socialTemplates.active, true)),
      ])
      const data = Object.fromEntries(
        CATEGORIES.map((c) => [
          c.key,
          { ...rules[c.key], detectFrom: rules[c.key].detectFrom?.toISOString() ?? null, hasActiveTemplate: active.some((a) => a.category === c.key) },
        ]),
      )
      return <CategoryRulesList rules={data} />
    }
    case "generate": {
      const category: CategoryKey = isCategoryKey(params.cat) ? params.cat : "team"
      const [records, posts, active] = await Promise.all([
        getSourceRecords(category),
        db.select({ id: socialPosts.id, sourceId: socialPosts.sourceId, status: socialPosts.status }).from(socialPosts).where(eq(socialPosts.category, category)),
        db.select({ id: socialTemplates.id }).from(socialTemplates).where(and(eq(socialTemplates.category, category), eq(socialTemplates.active, true))).limit(1),
      ])
      const rows = records.map((r) => {
        const post = posts.find((p) => p.sourceId === r.sourceId)
        return { sourceId: r.sourceId, title: r.title, url: r.url, approvedAt: r.approvedAt.toISOString(), postId: post?.id ?? null, postStatus: post?.status ?? null }
      })
      return <GenerateStudio category={category} records={rows} hasTemplate={active.length > 0} />
    }
    case "approvals":
      return <PostList posts={await postsWith(["needs_review", "pending_approval", "rejected"])} focusPost={focusPost} empty="No drafts are waiting for review." />
    case "scheduled":
      return <PostList posts={await postsWith(["approved", "scheduled"])} focusPost={focusPost} empty="No approved or scheduled posts." />
    case "published":
      return <PostList posts={await postsWith(["published"])} focusPost={focusPost} empty="Nothing has been published yet." />
    case "accounts":
      return <AccountsPanel accounts={await db.select().from(socialAccounts)} />
    case "automation":
      return <AutomationPanel initial={await getAutomation()} />
    case "activity": {
      const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityType, "social_agent")).orderBy(desc(auditLogs.createdAt)).limit(150)
      if (logs.length === 0) return <p className="text-sm text-muted-2">No activity yet.</p>
      return (
        <div className="overflow-x-auto rounded-lg border border-line bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase text-muted-2">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">When</th>
                <th scope="col" className="px-3 py-2 font-semibold">Who</th>
                <th scope="col" className="px-3 py-2 font-semibold">Action</th>
                <th scope="col" className="px-3 py-2 font-semibold">Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-2">{l.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Karachi" })}</td>
                  <td className="px-3 py-2 text-body">{l.actorName || "System"}</td>
                  <td className="px-3 py-2 text-body">{l.action.replace(/^social\./, "").replace(/\./g, " ")}</td>
                  <td className="px-3 py-2 text-heading">{l.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }
}

function PostList({ posts, focusPost, empty }: { posts: AgentPost[]; focusPost: number | null; empty: string }) {
  if (posts.length === 0) return <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted-2">{empty}</p>
  return (
    <div className="flex flex-col gap-3">
      {posts.map((p) => <PostCard key={`${p.id}-${p.updatedAt}`} post={p} defaultOpen={p.id === focusPost || posts.length === 1} />)}
    </div>
  )
}

async function Overview() {
  const [posts, templates, rules, automation] = await Promise.all([
    db.select({ status: socialPosts.status, category: socialPosts.category }).from(socialPosts),
    db.select({ category: socialTemplates.category, active: socialTemplates.active }).from(socialTemplates),
    getAllRules(),
    getAutomation(),
  ])
  const count = (s: string) => posts.filter((p) => p.status === s).length
  const waiting = count("needs_review") + count("pending_approval")
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {(Object.keys(POST_STATUSES) as (keyof typeof POST_STATUSES)[]).filter((s) => s !== "rejected").map((s) => (
          <div key={s} className="rounded-lg border border-line bg-card p-3">
            <dt className="text-xs text-muted-2">{POST_STATUSES[s]}</dt>
            <dd className="mt-1 font-serif text-2xl font-bold text-heading">{count(s)}</dd>
          </div>
        ))}
      </dl>
      {waiting > 0 && (
        <Link href="/admin/social-agent?tab=approvals" className="self-start rounded-md bg-green px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-green-hover">
          Review {waiting} waiting post{waiting === 1 ? "" : "s"}
        </Link>
      )}
      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase text-muted-2">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Category</th>
              <th scope="col" className="px-3 py-2 font-semibold">Template</th>
              <th scope="col" className="px-3 py-2 font-semibold">Auto-create</th>
              <th scope="col" className="px-3 py-2 font-semibold">Posts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {CATEGORIES.map((c) => (
              <tr key={c.key}>
                <td className="px-3 py-2 font-medium text-heading">{categoryLabel(c.key)}</td>
                <td className="px-3 py-2">
                  {templates.some((t) => t.category === c.key && t.active) ? (
                    <span className="text-green">Active</span>
                  ) : (
                    <Link href="/admin/social-agent?tab=templates" className="text-warning underline">Upload template</Link>
                  )}
                </td>
                <td className="px-3 py-2 text-body">{!rules[c.key].enabled ? "Disabled" : rules[c.key].autoGenerate ? "On" : "Manual"}</td>
                <td className="px-3 py-2 text-body">{posts.filter((p) => p.category === c.key).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-2">
        Daily scan: {automation.enabled ? "on" : "off"}
        {automation.lastRunAt ? ` · last run ${new Date(automation.lastRunAt).toLocaleString("en-GB")}` : ""}
      </p>
    </div>
  )
}

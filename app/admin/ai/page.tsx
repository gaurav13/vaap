import { redirect } from "next/navigation"
import { currentOperator } from "@/lib/rbac"
import { parseRange } from "@/lib/ai-assistant/analytics"
import { AiTabsNav, AI_TABS, type AiTab } from "@/components/admin/ai/ai-tabs-nav"
import { OverviewTab } from "@/components/admin/ai/tabs/overview-tab"
import { QuestionsTab } from "@/components/admin/ai/tabs/questions-tab"
import { CorrectionsTab } from "@/components/admin/ai/tabs/corrections-tab"
import { KnowledgeTab } from "@/components/admin/ai/tabs/knowledge-tab"
import { ImprovementTab } from "@/components/admin/ai/tabs/improvement-tab"
import { CostTab } from "@/components/admin/ai/tabs/cost-tab"
import { UsersTab } from "@/components/admin/ai/tabs/users-tab"
import { SettingsTab } from "@/components/admin/ai/tabs/settings-tab"
import { ApiTab } from "@/components/admin/ai/tabs/api-tab"
import { AuditTab } from "@/components/admin/ai/tabs/audit-tab"

export const metadata = { title: "Ask VAAP AI Management | VAAP Admin" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminAiPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await currentOperator()
  if (!actor || (actor.role !== "admin" && actor.role !== "manager")) redirect("/admin")
  const isSuperAdmin = actor.role === "admin"

  const sp = await searchParams
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined
  const requested = (one("tab") ?? "overview") as AiTab
  const allowed = AI_TABS.filter((t) => isSuperAdmin || !("adminOnly" in t)).map((t) => t.key)
  const tab = allowed.includes(requested) ? requested : "overview"
  const range = parseRange(one("range"))
  const page = Number(one("page")) || 1

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-bold text-heading text-balance">Ask VAAP AI Management</h1>
        <p className="text-pretty leading-relaxed text-muted-2">
          Usage, cost, budget, knowledge and answer quality for the Ask VAAP AI assistant. All numbers come from logged
          requests.
        </p>
      </header>

      <AiTabsNav active={tab} isSuperAdmin={isSuperAdmin} />

      {tab === "overview" && <OverviewTab range={range} isSuperAdmin={isSuperAdmin} />}
      {tab === "questions" && (
        <QuestionsTab range={range} page={page} q={one("q") ?? ""} status={one("status") ?? ""} isSuperAdmin={isSuperAdmin} />
      )}
      {tab === "corrections" && (
        <CorrectionsTab status={one("status") ?? ""} isSuperAdmin={isSuperAdmin} fromLog={Number(one("log")) || null} />
      )}
      {tab === "knowledge" && <KnowledgeTab isSuperAdmin={isSuperAdmin} />}
      {tab === "improvement" && <ImprovementTab range={range} />}
      {tab === "cost" && <CostTab range={range} page={page} status={one("status") ?? ""} />}
      {tab === "users" && <UsersTab range={range} />}
      {tab === "settings" && <SettingsTab />}
      {tab === "api" && <ApiTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  )
}

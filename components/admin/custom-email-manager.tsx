"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FilePlus2, Plus } from "lucide-react"
import { CampaignComposer } from "@/components/admin/email/campaign-composer"
import { DraftList } from "@/components/admin/email/draft-list"
import { EmailHistory } from "@/components/admin/email/email-history"
import { Btn, Notice, type ComposerMode, type Draft, type Msg } from "@/components/admin/email/shared"
import { Tabs } from "@/components/admin/email/tabs"
import type { EditableRow, HistoryRow, TemplateRow } from "@/lib/newsletter/admin-data"
import { EMPTY_AUDIENCE, EMPTY_CONTENT } from "@/lib/newsletter/content"

type Tab = "drafts" | "templates" | "history"

const blank = (isMarketing: boolean): Draft => ({
  id: null,
  status: "draft",
  name: "",
  content: EMPTY_CONTENT,
  audience: EMPTY_AUDIENCE,
  isMarketing,
  scheduledAt: null,
})

export function CustomEmailManager({
  drafts,
  templates,
  history,
  plans,
  canSend,
}: {
  drafts: EditableRow[]
  templates: TemplateRow[]
  history: HistoryRow[]
  plans: string[]
  canSend: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("drafts")
  const [editing, setEditing] = useState<{ mode: ComposerMode; draft: Draft } | null>(null)
  const [msg, setMsg] = useState<Msg>(null)

  if (editing)
    return (
      <CampaignComposer
        key={`${editing.mode}-${editing.draft.id ?? "new"}`}
        mode={editing.mode}
        initial={editing.draft}
        plans={plans}
        canSend={canSend}
        onUseTemplate={(draft) => {
          setEditing({ mode: "custom", draft })
          router.refresh()
        }}
        onClose={(m) => {
          const wasTemplate = editing.mode === "template"
          setEditing(null)
          setMsg(m ?? null)
          setTab(m ? "history" : wasTemplate ? "templates" : "drafts")
          router.refresh()
        }}
      />
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Custom email sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "drafts", label: "Drafts & scheduled", count: drafts.length },
            { value: "templates", label: "Templates", count: templates.length },
            { value: "history", label: "Sent history", count: history.length },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Btn variant="secondary" onClick={() => setEditing({ mode: "template", draft: blank(true) })}>
            <FilePlus2 className="size-4" aria-hidden="true" />
            New template
          </Btn>
          <Btn onClick={() => setEditing({ mode: "custom", draft: blank(true) })}>
            <Plus className="size-4" aria-hidden="true" />
            New email
          </Btn>
        </div>
      </div>
      <Notice msg={msg} />
      {tab === "drafts" && (
        <DraftList rows={drafts} kind="campaign" canSend={canSend} onEdit={(d) => setEditing({ mode: "custom", draft: d })} empty="No custom email drafts. Start a new email or use a template." />
      )}
      {tab === "templates" && (
        <DraftList
          rows={templates}
          kind="template"
          canSend={canSend}
          onEdit={(d) => setEditing({ mode: "template", draft: d })}
          empty="No templates yet. Save announcements, reminders or invitations you send often as templates."
        />
      )}
      {tab === "history" && <EmailHistory rows={history} canSend={canSend} onDuplicated={() => setTab("drafts")} />}
    </div>
  )
}

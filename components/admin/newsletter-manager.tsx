"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { addNewsletterSubscribers, setSubscriberStatus } from "@/app/actions/newsletters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CampaignComposer } from "@/components/admin/email/campaign-composer"
import { DraftList } from "@/components/admin/email/draft-list"
import { EmailHistory } from "@/components/admin/email/email-history"
import { Btn, fmtDate, Notice, type Draft, type Msg } from "@/components/admin/email/shared"
import { Tabs } from "@/components/admin/email/tabs"
import type { EditableRow, HistoryRow } from "@/lib/newsletter/admin-data"
import { EMPTY_AUDIENCE, EMPTY_CONTENT } from "@/lib/newsletter/content"

type Subscriber = { id: number; email: string; name: string; status: string; source: string; createdAt: string }
type Tab = "drafts" | "history" | "subscribers"

const NEW_NEWSLETTER: Draft = {
  id: null,
  status: "draft",
  name: "",
  content: EMPTY_CONTENT,
  audience: { ...EMPTY_AUDIENCE, groups: ["all"] },
  isMarketing: true,
  scheduledAt: null,
}

export function NewsletterManager({
  drafts,
  history,
  subscribers,
  plans,
  canSend,
}: {
  drafts: EditableRow[]
  history: HistoryRow[]
  subscribers: Subscriber[]
  plans: string[]
  canSend: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("drafts")
  const [editing, setEditing] = useState<Draft | null>(null)
  const [msg, setMsg] = useState<Msg>(null)

  if (editing)
    return (
      <CampaignComposer
        key={editing.id ?? "new"}
        mode="newsletter"
        initial={editing}
        plans={plans}
        canSend={canSend}
        onClose={(m) => {
          setEditing(null)
          setMsg(m ?? null)
          if (m) setTab("history")
          router.refresh()
        }}
      />
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Newsletter sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "drafts", label: "Drafts & scheduled", count: drafts.length },
            { value: "history", label: "Sent history", count: history.length },
            { value: "subscribers", label: "Subscribers", count: subscribers.length },
          ]}
        />
        <Btn onClick={() => setEditing(NEW_NEWSLETTER)}>
          <Plus className="size-4" aria-hidden="true" />
          New newsletter
        </Btn>
      </div>
      <Notice msg={msg} />
      {tab === "drafts" && <DraftList rows={drafts} kind="campaign" canSend={canSend} onEdit={setEditing} empty="No drafts yet. Start a new newsletter." />}
      {tab === "history" && <EmailHistory rows={history} canSend={canSend} onDuplicated={() => setTab("drafts")} />}
      {tab === "subscribers" && <SubscriberList subscribers={subscribers} canManage={canSend} />}
    </div>
  )
}

function SubscriberList({ subscribers, canManage }: { subscribers: Subscriber[]; canManage: boolean }) {
  const router = useRouter()
  const [raw, setRaw] = useState("")
  const [consent, setConsent] = useState("")
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()

  return (
    <div className="flex flex-col gap-4">
      <Notice msg={msg} />
      {canManage && (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold text-heading">Add opted-in contacts</h2>
          <p className="text-sm text-muted-2">Only add people who asked to receive VAAP emails. One per line, as an email or Name &lt;email&gt;.</p>
          <Label htmlFor="sub-raw" className="sr-only">
            Contacts
          </Label>
          <Textarea id="sub-raw" rows={4} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"ali@example.com\nSara Khan <sara@example.com>"} />
          <Label htmlFor="sub-consent">How did they consent?</Label>
          <Input id="sub-consent" value={consent} onChange={(e) => setConsent(e.target.value)} placeholder="e.g. Signed up at the Lahore summit, Nov 2026" />
          <Button
            className="w-fit"
            disabled={pending || !raw.trim() || !consent.trim()}
            onClick={() =>
              start(async () => {
                const res = await addNewsletterSubscribers(raw, consent)
                setMsg(res.ok ? { tone: "ok", text: `${res.added} added, ${res.skipped} skipped (invalid or already listed).` } : { tone: "error", text: res.error })
                if (res.ok) setRaw("")
                router.refresh()
              })
            }
          >
            Add contacts
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        {subscribers.length === 0 ? (
          <p className="p-6 text-sm text-muted-2">No non-member subscribers yet. Members receive newsletters automatically.</p>
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted-2">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                {canManage && (
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-b border-line-light last:border-0">
                  <td className="px-4 py-3 text-heading">{s.email}</td>
                  <td className="px-4 py-3 text-body">{s.name || "—"}</td>
                  <td className="px-4 py-3 capitalize text-body">{s.status}</td>
                  <td className="px-4 py-3 text-muted-2">{fmtDate(s.createdAt)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await setSubscriberStatus(s.id, s.status === "subscribed" ? "unsubscribed" : "subscribed")
                            router.refresh()
                          })
                        }
                      >
                        {s.status === "subscribed" ? "Unsubscribe" : "Resubscribe"}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

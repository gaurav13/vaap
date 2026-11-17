import { loadEditable, loadHistory, loadPlans, loadTemplates } from "@/lib/newsletter/admin-data"
import { CustomEmailManager } from "@/components/admin/custom-email-manager"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export const metadata = { title: "Custom Emails | VAAP Admin" }

export default async function AdminCustomEmailsPage() {
  const session = await getSession()
  const canSend = session?.user?.role === "admin" || session?.user?.role === "manager"

  const [drafts, templates, history, plans] = await Promise.all([loadEditable("custom"), loadTemplates(), loadHistory(), loadPlans()])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-heading">Custom Emails</h1>
        <p className="mt-1 text-pretty leading-relaxed text-muted-2">
          Send one-off announcements, reminders and invitations to any group, or save them as reusable templates. Every email goes through the same recipient review, preview and confirmation as newsletters.
        </p>
      </div>
      <CustomEmailManager canSend={canSend} drafts={drafts} templates={templates} history={history.filter((h) => h.kind === "custom")} plans={plans} />
    </div>
  )
}

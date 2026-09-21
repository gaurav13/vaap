import { getContactMessages } from "@/app/actions/admin"
import { MessagesManager } from "@/components/admin/messages-manager"

export default async function AdminMessagesPage() {
  const rows = await getContactMessages()
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Messages</h1>
      <p className="mt-1 text-muted-2">Inquiries submitted through the contact form.</p>
      <MessagesManager
        items={rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          subject: r.subject,
          message: r.message,
          handled: r.handled,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}

import { getContactMessageReplies, getContactMessages } from "@/app/actions/admin"
import { MessagesManager, type MessageReply } from "@/components/admin/messages-manager"

export default async function AdminMessagesPage() {
  const [rows, replies] = await Promise.all([getContactMessages(), getContactMessageReplies()])

  const repliesByMessage = new Map<number, MessageReply[]>()
  for (const r of replies) {
    const list = repliesByMessage.get(r.messageId) ?? []
    list.push({
      id: r.id,
      body: r.body,
      sentByName: r.sentByName,
      emailStatus: r.emailStatus,
      createdAt: r.createdAt.toISOString(),
    })
    repliesByMessage.set(r.messageId, list)
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Messages</h1>
      <p className="mt-1 text-muted-2">Inquiries submitted through the contact form. Replies are emailed to the sender and kept in each thread.</p>
      <MessagesManager
        items={rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          organization: r.organization,
          phone: r.phone,
          inquiryType: r.inquiryType,
          subject: r.subject,
          message: r.message,
          handled: r.handled,
          createdAt: r.createdAt.toISOString(),
          replies: repliesByMessage.get(r.id) ?? [],
        }))}
      />
    </div>
  )
}

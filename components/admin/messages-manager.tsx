"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Building2, Check, CornerUpLeft, Loader2, Mail, Phone, RotateCcw, Search, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { replyToContactMessage, setMessageHandled } from "@/app/actions/admin"

export type MessageReply = {
  id: number
  body: string
  sentByName: string | null
  emailStatus: string
  createdAt: string
}

type Message = {
  id: number
  name: string
  email: string
  organization?: string | null
  phone?: string | null
  inquiryType?: string
  subject: string
  message: string
  handled: boolean
  createdAt: string
  replies: MessageReply[]
}

type Filter = "open" | "replied" | "handled" | "all"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "Needs reply" },
  { key: "replied", label: "Replied" },
  { key: "handled", label: "Handled" },
  { key: "all", label: "All" },
]

const SIGN_OFF = "Kind regards,\nVAAP Secretariat\nVirtual Asset Industry Alliance of Pakistan"

const TEMPLATES: { label: string; body: (name: string) => string }[] = [
  {
    label: "Acknowledge",
    body: () =>
      `Thank you for reaching out to VAAP. We have received your message and a member of our team is reviewing it. We will get back to you with a detailed response shortly.\n\n${SIGN_OFF}`,
  },
  {
    label: "Membership info",
    body: () =>
      `Thank you for your interest in joining VAAP.\n\nMembership gives you access to our professional network, industry events, working groups, policy consultations and member-only resources. You can compare membership categories, fees and eligibility requirements, and apply online, at https://vaap.org.pk/membership\n\nIf you share a little more about your background, we are happy to recommend the most suitable category.\n\n${SIGN_OFF}`,
  },
  {
    label: "Working groups",
    body: () =>
      `Thank you for offering to contribute to VAAP's initiatives. Our committees and working groups welcome members with relevant expertise. Once your membership is active, you can express interest in a working group and our team will connect you with the relevant chair.\n\n${SIGN_OFF}`,
  },
]

function formatDate(iso: string, withTime = false) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  })
}

function statusOf(m: Message) {
  if (m.handled) return "handled" as const
  if (m.replies.some((r) => r.emailStatus === "sent")) return "replied" as const
  return "open" as const
}

export function MessagesManager({ items }: { items: Message[] }) {
  const [filter, setFilter] = useState<Filter>("open")
  const [query, setQuery] = useState("")

  const counts = useMemo(() => {
    const c = { open: 0, replied: 0, handled: 0, all: items.length }
    for (const m of items) c[statusOf(m)]++
    return c
  }, [items])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((m) => {
      if (filter !== "all" && statusOf(m) !== filter) return false
      if (!q) return true
      return [m.name, m.email, m.subject, m.message, m.organization ?? ""].some((v) => v.toLowerCase().includes(q))
    })
  }, [items, filter, query])

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label="Filter messages" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                filter === f.key ? "border-green bg-green text-white" : "border-line bg-card text-body hover:bg-mint",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  filter === f.key ? "bg-card/20 text-white" : "bg-muted text-muted-2",
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
        <label className="relative flex items-center md:w-72">
          <span className="sr-only">Search messages</span>
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-2" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, subject…"
            className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-body outline-none focus:border-green"
          />
        </label>
      </div>

      <div className="flex flex-col gap-4">
        {visible.length === 0 && (
          <p className="rounded-xl border border-dashed border-line bg-card p-8 text-center text-sm text-muted-2">
            No messages in this view.
          </p>
        )}
        {visible.map((m) => (
          <MessageCard key={m.id} message={m} />
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: ReturnType<typeof statusOf> }) {
  const styles = {
    open: "bg-amber-100 text-amber-800",
    replied: "bg-mint text-green",
    handled: "bg-muted text-muted-2",
  }[status]
  const label = { open: "Needs reply", replied: "Replied", handled: "Handled" }[status]
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", styles)}>{label}</span>
}

function MessageCard({ message: m }: { message: Message }) {
  const router = useRouter()
  const [composing, setComposing] = useState(false)
  const [body, setBody] = useState("")
  const [markHandled, setMarkHandled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const status = statusOf(m)

  function toggleHandled(handled: boolean) {
    startTransition(async () => {
      await setMessageHandled(m.id, handled)
      router.refresh()
    })
  }

  function openComposer() {
    setError(null)
    setNotice(null)
    if (!body) setBody(`\n\n${SIGN_OFF}`)
    setComposing(true)
  }

  function send() {
    setError(null)
    startTransition(async () => {
      const res = await replyToContactMessage(m.id, { body, markHandled })
      if (!res.ok) {
        setError(res.error)
        router.refresh()
        return
      }
      setBody("")
      setComposing(false)
      setNotice(
        res.emailStatus === "sent"
          ? `Reply emailed to ${m.email}.`
          : "Reply saved, but email delivery is not configured so it was not sent.",
      )
      router.refresh()
    })
  }

  return (
    <article className={cn("rounded-xl border bg-card p-5", status === "open" ? "border-green-border" : "border-line")}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-heading text-pretty">{m.subject || "(No subject)"}</h3>
            <StatusBadge status={status} />
            {m.inquiryType && (
              <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted-2">{m.inquiryType}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-2">
            <span className="flex items-center gap-1.5">
              <Mail className="size-3.5" aria-hidden="true" /> {m.name} · {m.email}
            </span>
            {m.organization && (
              <span className="flex items-center gap-1.5">
                <Building2 className="size-3.5" aria-hidden="true" /> {m.organization}
              </span>
            )}
            {m.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" aria-hidden="true" /> {m.phone}
              </span>
            )}
          </div>
        </div>
        <time dateTime={m.createdAt} className="text-xs text-muted-2">
          {formatDate(m.createdAt)}
        </time>
      </header>

      <p className="mt-3 whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-body">{m.message}</p>

      {m.replies.length > 0 && (
        <ol className="mt-4 flex flex-col gap-3 border-l-2 border-green-border pl-4" aria-label="Replies">
          {m.replies.map((r) => (
            <li key={r.id} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-2">
                <CornerUpLeft className="size-3.5 text-green" aria-hidden="true" />
                <span className="font-semibold text-heading">{r.sentByName || "VAAP team"}</span>
                <span>{formatDate(r.createdAt, true)}</span>
                {r.emailStatus !== "sent" && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                    {r.emailStatus === "failed" ? "Delivery failed" : "Not emailed"}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-body">{r.body}</p>
            </li>
          ))}
        </ol>
      )}

      {notice && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-mint px-3 py-2 text-sm text-green">
          <Check className="size-4" aria-hidden="true" /> {notice}
        </p>
      )}

      {composing ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-heading">
              Reply to {m.name} <span className="font-normal text-muted-2">({m.email})</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-2">Templates:</span>
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setBody(t.body(m.name))}
                  className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-body transition-colors hover:bg-mint"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label htmlFor={`reply-${m.id}`} className="sr-only">
            Reply message
          </label>
          <textarea
            id={`reply-${m.id}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            maxLength={10000}
            autoFocus
            className="w-full resize-y rounded-lg border border-line bg-card p-3 text-sm leading-relaxed text-body outline-none focus:border-green"
            placeholder="Write your answer…"
          />
          <p className="text-xs text-muted-2">
            {`The email opens with "Dear ${m.name}," and quotes their original message below your reply.`}
          </p>
          {error && (
            <p role="alert" className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="size-4" aria-hidden="true" /> {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={markHandled}
                onChange={(e) => setMarkHandled(e.target.checked)}
                className="size-4 accent-[var(--color-green)]"
              />
              Mark as handled after sending
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setComposing(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-body transition-colors hover:bg-mint"
              >
                <X className="size-4" aria-hidden="true" /> Cancel
              </button>
              <button
                type="button"
                disabled={pending || body.trim().length < 2}
                onClick={send}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                Send reply
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openComposer}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-body transition-colors hover:bg-mint"
          >
            <CornerUpLeft className="size-4" aria-hidden="true" /> {m.replies.length ? "Reply again" : "Reply"}
          </button>
          {m.handled ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => toggleHandled(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-body transition-colors hover:bg-mint"
            >
              <RotateCcw className="size-4" aria-hidden="true" /> Reopen
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => toggleHandled(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
            >
              <Check className="size-4" aria-hidden="true" /> Mark handled
            </button>
          )}
        </div>
      )}
    </article>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Award, Bell, CheckCheck, FileCheck2, IdCard, Info, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NotificationItem } from "@/components/member/notification-bell"
import { markAllNotificationsRead, markNotificationsRead } from "@/app/actions/referrals"

const TYPE_META: Record<string, { icon: typeof Bell; badge: string }> = {
  membership: { icon: IdCard, badge: "bg-green/10 text-green" },
  application: { icon: FileCheck2, badge: "bg-gold/15 text-gold-ink" },
  reward: { icon: Award, badge: "bg-green/10 text-green" },
  security: { icon: ShieldAlert, badge: "bg-destructive/10 text-destructive" },
  info: { icon: Info, badge: "bg-muted text-muted-2" },
}

function formatDate(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function NotificationsList({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>(initial)
  const [, startTransition] = useTransition()

  const unread = items.filter((n) => !n.read).length

  function open(item: NotificationItem) {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)))
      startTransition(async () => {
        await markNotificationsRead([item.id])
      })
    }
    if (item.link) router.push(item.link)
  }

  function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    startTransition(async () => {
      await markAllNotificationsRead()
      router.refresh()
    })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-card px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-mint">
          <Bell className="size-6 text-green" />
        </span>
        <p className="text-base font-semibold text-heading">No notifications yet</p>
        <p className="max-w-sm text-sm text-muted-2">
          Updates about your membership, applications, rewards, and account security will show up here.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-line bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <p className="text-sm text-muted-2">
          {unread > 0 ? (
            <>
              <span className="font-bold text-heading">{unread}</span> unread
            </>
          ) : (
            "All caught up"
          )}
        </p>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-green transition-colors hover:bg-mint hover:text-navy"
          >
            <CheckCheck className="size-4" /> Mark all read
          </button>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-line">
        {items.map((item) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.info
          const Icon = meta.icon
          const clickable = Boolean(item.link)
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => open(item)}
                disabled={!clickable && item.read}
                className={cn(
                  "flex w-full items-start gap-4 px-4 py-4 text-left transition-colors sm:px-5",
                  clickable && "hover:bg-mint/50",
                  !item.read && "bg-mint/25",
                )}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", meta.badge)}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-bold text-heading">{item.title}</span>
                    {!item.read && <span className="size-2 rounded-full bg-green" aria-label="Unread" />}
                  </span>
                  {item.body && <span className="mt-1 block text-sm leading-relaxed text-body">{item.body}</span>}
                  <span className="mt-1.5 block text-xs text-muted-2">{formatDate(item.createdAt)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

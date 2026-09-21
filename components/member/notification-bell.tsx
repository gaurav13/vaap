"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Check, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
} from "@/app/actions/referrals"

export type NotificationItem = {
  id: number
  type: string
  title: string
  body: string
  link: string
  read: boolean
  createdAt: string | Date
}

function timeAgo(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

const TYPE_DOT: Record<string, string> = {
  membership: "bg-green",
  application: "bg-gold",
  reward: "bg-green",
  security: "bg-destructive",
  info: "bg-muted-2",
}

export function NotificationBell({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>(initial)
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  const unread = items.filter((n) => !n.read).length

  const refresh = useCallback(async () => {
    try {
      const rows = (await getMyNotifications()) as unknown as NotificationItem[]
      setItems(rows)
    } catch {
      // Silent — the bell should never break the shell.
    }
  }, [])

  // Poll periodically so new events (approvals, rewards) surface without a
  // full reload. Also refresh whenever the panel is opened.
  useEffect(() => {
    const timer = setInterval(refresh, 30000)
    return () => clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) void refresh()
  }

  function handleOpenItem(item: NotificationItem) {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)))
      startTransition(async () => {
        await markNotificationsRead([item.id])
      })
    }
    setOpen(false)
    if (item.link) router.push(item.link)
  }

  function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    startTransition(async () => {
      await markAllNotificationsRead()
      router.refresh()
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={toggle}
        className="relative flex size-10 items-center justify-center rounded-full text-body transition-colors hover:bg-mint hover:text-navy"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-card">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-line bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold text-heading">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs font-semibold text-green transition-colors hover:text-navy"
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-mint">
                  <Bell className="size-5 text-green" />
                </span>
                <p className="text-sm font-semibold text-heading">You&apos;re all caught up</p>
                <p className="text-xs text-muted-2">New updates will appear here.</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {items.slice(0, 12).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenItem(item)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-mint/60",
                        !item.read && "bg-mint/30",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          TYPE_DOT[item.type] ?? TYPE_DOT.info,
                          item.read && "opacity-30",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-heading">{item.title}</span>
                          <span className="shrink-0 text-[11px] text-muted-2">{timeAgo(item.createdAt)}</span>
                        </span>
                        {item.body && <span className="mt-0.5 line-clamp-2 block text-xs text-body">{item.body}</span>}
                      </span>
                      {!item.read && <Check className="mt-0.5 size-3.5 shrink-0 text-green" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line p-2">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-center text-sm font-semibold text-green transition-colors hover:bg-mint hover:text-navy"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

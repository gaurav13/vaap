import Link from "next/link"
import { ArrowRight, CalendarDays, FileText, Inbox, Newspaper, Users } from "lucide-react"
import { db } from "@/lib/db"
import { news, events, membershipApplications, contactMessages, user } from "@/lib/db/schema"
import { count, eq } from "drizzle-orm"

async function counts() {
  const [n, e, appsPending, msgsNew, members] = await Promise.all([
    db.select({ v: count() }).from(news),
    db.select({ v: count() }).from(events),
    db.select({ v: count() }).from(membershipApplications).where(eq(membershipApplications.status, "pending")),
    db.select({ v: count() }).from(contactMessages).where(eq(contactMessages.handled, false)),
    db.select({ v: count() }).from(user),
  ])
  return {
    news: n[0]?.v ?? 0,
    events: e[0]?.v ?? 0,
    appsPending: appsPending[0]?.v ?? 0,
    msgsNew: msgsNew[0]?.v ?? 0,
    members: members[0]?.v ?? 0,
  }
}

export default async function AdminOverview() {
  const c = await counts()

  const cards = [
    { label: "News posts", value: c.news, href: "/admin/news", icon: Newspaper },
    { label: "Events", value: c.events, href: "/admin/events", icon: CalendarDays },
    { label: "Pending applications", value: c.appsPending, href: "/admin/applications", icon: FileText },
    { label: "New messages", value: c.msgsNew, href: "/admin/messages", icon: Inbox },
    { label: "Registered users", value: c.members, href: "/admin/users", icon: Users },
  ]

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Overview</h1>
      <p className="mt-1 text-muted-2">A snapshot of activity across the VAAP platform.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group flex items-center justify-between rounded-xl border border-line bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-green-border hover:shadow-[0_16px_36px_-24px_rgba(16,42,54,0.4)]"
            >
              <div>
                <p className="text-3xl font-extrabold text-heading">{card.value}</p>
                <p className="mt-1 text-sm text-muted-2">{card.label}</p>
              </div>
              <span className="flex size-12 items-center justify-center rounded-xl bg-mint text-green transition-colors group-hover:bg-green group-hover:text-white">
                <Icon className="size-6" />
              </span>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/news"
          className="flex items-center justify-between rounded-xl border border-line bg-card p-5 text-sm font-semibold text-navy transition-colors hover:border-green-border"
        >
          Publish a news post <ArrowRight className="size-4 text-green" />
        </Link>
        <Link
          href="/admin/events"
          className="flex items-center justify-between rounded-xl border border-line bg-card p-5 text-sm font-semibold text-navy transition-colors hover:border-green-border"
        >
          Schedule an event <ArrowRight className="size-4 text-green" />
        </Link>
      </div>
    </div>
  )
}

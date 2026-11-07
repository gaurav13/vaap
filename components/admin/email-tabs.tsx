import Link from "next/link"
import { cn } from "@/lib/utils"

export function EmailTabs({ active }: { active: "templates" | "notifications" | "automations" | "logs" }) {
  const tabs = [
    { id: "templates", label: "Templates", href: "/admin/emails" },
    { id: "notifications", label: "Admin Notifications", href: "/admin/emails/notifications" },
    { id: "automations", label: "Automations", href: "/admin/emails/automations" },
    { id: "logs", label: "Email Logs", href: "/admin/emails/logs" },
  ] as const
  return (
    <nav aria-label="Email sections" className="mt-6 flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={active === t.id ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            active === t.id ? "border-green text-green" : "border-transparent text-muted-2 hover:text-heading",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

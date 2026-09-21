import type React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AdminNav } from "@/components/admin/admin-nav"
import { AdminTopbar } from "@/components/admin/admin-topbar"
import { db } from "@/lib/db"
import { membershipApplications } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const role = session.user.role
  if (role !== "staff" && role !== "admin") redirect("/dashboard")

  const pending = await db
    .select({ id: membershipApplications.id })
    .from(membershipApplications)
    .where(eq(membershipApplications.status, "pending"))

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 lg:flex-row">
      <AdminNav role={role as "staff" | "admin"} name={session.user.name ?? "Admin"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar role={role as "staff" | "admin"} name={session.user.name ?? "Admin"} notifications={pending.length} />
        <main className="flex-1 px-5 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  )
}

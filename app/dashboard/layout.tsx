import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { MemberShell } from "@/components/member/member-shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const u = session.user
  return (
    <MemberShell user={{ name: u.name ?? "Member", email: u.email, role: u.role }}>{children}</MemberShell>
  )
}

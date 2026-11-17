import { MembershipCaseManager } from "@/components/admin/membership-case-manager"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function AdminMembershipPage() {
  const session = await getSession()
  const isSuperAdmin = session?.user?.role === "admin"
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-heading">Membership Management</h1>
        <p className="mt-1 text-pretty text-muted-2">
          Find any application or member by name, email, membership ID or payment reference. Reconcile payments, correct emails and resolve status issues from one place. Every change is logged.
        </p>
      </div>
      <MembershipCaseManager isSuperAdmin={isSuperAdmin} />
    </div>
  )
}

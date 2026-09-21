import { getUsers } from "@/app/actions/admin"
import { getSession } from "@/lib/session"
import { UsersManager } from "@/components/admin/users-manager"

export default async function AdminUsersPage() {
  const [rows, session] = await Promise.all([getUsers(), getSession()])
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Users & Roles</h1>
      <p className="mt-1 text-muted-2">Manage member access. Only admins can change roles.</p>
      <UsersManager
        currentUserId={session!.user.id}
        items={rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role as "member" | "staff" | "admin",
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}

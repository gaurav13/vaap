import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export type UserRole =
  | "member"
  | "staff"
  | "committee_head"
  | "committee_member"
  | "kol"
  | "admin"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: UserRole
  image?: string | null
}

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const u = session.user as unknown as SessionUser & { role?: string }
  return {
    ...session,
    user: {
      ...u,
      role: (u.role as UserRole) ?? "member",
    },
  }
}

export function isStaff(role: string | undefined | null) {
  return role === "staff" || role === "admin"
}

export function isAdmin(role: string | undefined | null) {
  return role === "admin"
}

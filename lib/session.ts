import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { cache } from "react"

export type UserRole =
  | "member"
  | "staff"
  | "committee_head"
  | "committee_member"
  | "kol"
  // Operational "Admin" (stored as "manager" so existing "admin" = Super Admin checks stay intact).
  | "manager"
  | "admin"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: UserRole
  image?: string | null
}

// Deduplicated per request: the layout, header and page all ask for the session.
export const getSession = cache(async function getSession() {
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
})

export function isStaff(role: string | undefined | null) {
  return role === "staff" || role === "manager" || role === "admin"
}

export function isAdmin(role: string | undefined | null) {
  return role === "admin"
}

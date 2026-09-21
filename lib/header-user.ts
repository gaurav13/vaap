import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import type { HeaderUser } from "@/components/site-header"

type SessionLike = {
  user?: {
    id: string
    name?: string | null
    email?: string | null
    role?: string | null
  }
} | null

export function toHeaderUser(session: SessionLike): HeaderUser {
  if (!session?.user) return null
  const role = session.user.role
  return {
    id: session.user.id,
    name: session.user.name ?? "Member",
    email: session.user.email ?? "",
    role: role === "admin" || role === "staff" ? role : "member",
  }
}

export async function getHeaderUser(): Promise<HeaderUser> {
  const session = await auth.api.getSession({ headers: await headers() })
  return toHeaderUser(session as SessionLike)
}

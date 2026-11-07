import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { kolProfiles, members } from "@/lib/db/schema"
import { getSession, isStaff } from "@/lib/session"
import { getPrivateObject } from "@/lib/spaces"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Streams a private KOL evidence file to its owner or to VAAP staff only.
export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.user) return new Response("Unauthorized", { status: 401 })

  const key = new URL(request.url).searchParams.get("key") ?? ""
  const match = /^kol-evidence\/(\d+)\/[0-9a-f-]+\.(pdf|jpg|png|webp|gif|avif)$/.exec(key)
  if (!match) return new Response("Not found", { status: 404 })
  const memberId = Number(match[1])

  if (!isStaff(session.user.role)) {
    const [own] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.userId, session.user.id), eq(members.id, memberId), isNull(members.deletedAt)))
      .limit(1)
    if (!own) return new Response("Forbidden", { status: 403 })
  }

  const [profile] = await db.select({ evidence: kolProfiles.evidence }).from(kolProfiles).where(eq(kolProfiles.memberId, memberId)).limit(1)
  if (!profile?.evidence.some((e) => e.key === key)) return new Response("Not found", { status: 404 })

  try {
    const file = await getPrivateObject(key)
    return new Response(Buffer.from(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}

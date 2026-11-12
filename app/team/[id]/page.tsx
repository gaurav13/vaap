import { notFound, permanentRedirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { leadership } from "@/lib/db/schema"
import { leaderPath } from "@/lib/leadership"

// Legacy numeric profile URLs now redirect to /leadership/[section]/[slug].
export default async function LegacyTeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) notFound()

  const [row] = await db
    .select({ id: leadership.id, slug: leadership.slug, kind: leadership.kind })
    .from(leadership)
    .where(and(eq(leadership.id, numericId), eq(leadership.published, true)))
    .limit(1)
  if (!row?.slug) notFound()
  permanentRedirect(leaderPath(row))
}

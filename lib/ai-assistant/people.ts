import "server-only"

import { and, asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { leadership } from "@/lib/db/schema"
import { leaderPath } from "@/lib/leadership"
import { getPublicKols } from "@/lib/kol"
import { richTextToPlain } from "@/lib/rich-text-plain"
import type { PersonGroup, PublicPerson } from "./people-match"

function groupForKind(kind: string): PersonGroup {
  if (/advisory/i.test(kind)) return "advisory"
  if (/industry/i.test(kind)) return "industry"
  return "leadership"
}

/** Published leadership and verified KOLs, public fields only (no emails, phones, notes or evidence). */
export async function loadPublicPeople(): Promise<PublicPerson[]> {
  const [leaders, kols] = await Promise.all([
    db
      .select({
        id: leadership.id,
        name: leadership.name,
        slug: leadership.slug,
        kind: leadership.kind,
        position: leadership.position,
        title: leadership.title,
        organization: leadership.organization,
        summary: leadership.summary,
        bio: leadership.bio,
      })
      .from(leadership)
      .where(and(eq(leadership.published, true), eq(leadership.status, "approved")))
      .orderBy(asc(leadership.sortOrder)),
    getPublicKols(),
  ])
  return [
    ...leaders.map((l) => ({
      name: l.name,
      group: groupForKind(l.kind),
      role: l.position || l.kind,
      organization: [l.title, l.organization].filter(Boolean).join(", "),
      summary: richTextToPlain(l.summary || l.bio).slice(0, 500),
      link: leaderPath(l),
    })),
    ...kols.map((k) => ({
      name: k.fullName,
      aliases: k.professionalName ? [k.professionalName] : [],
      group: "kol" as const,
      role: "Verified Opinion Leader",
      organization: [k.title, k.organization].filter(Boolean).join(", "),
      summary: richTextToPlain(k.bio).slice(0, 500),
      link: `/membership/verified-opinion-leaders/${k.slug}`,
      verification: { status: "verified" as const, validUntil: k.expiresAt?.toISOString().slice(0, 10) ?? null },
    })),
  ]
}

export const GROUP_LINKS: Record<PersonGroup, { label: string; href: string }> = {
  leadership: { label: "Leadership", href: "/leadership/office-bearers" },
  advisory: { label: "Advisory Board", href: "/leadership/advisory-board" },
  industry: { label: "Industry Advisors", href: "/leadership/industry-advisors" },
  kol: { label: "Verified Opinion Leaders", href: "/membership/verified-opinion-leaders" },
}

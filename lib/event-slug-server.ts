import { and, eq, like, ne, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { slugifyEventTitle } from "@/lib/event-slug"

/** Returns a slug for `title` that no other event uses, adding -2, -3… on collision. */
export async function uniqueEventSlug(title: string, excludeId?: number) {
  const base = slugifyEventTitle(title)
  const match = or(eq(events.slug, base), like(events.slug, `${base}-%`))
  const rows = await db
    .select({ slug: events.slug })
    .from(events)
    .where(excludeId ? and(match, ne(events.id, excludeId)) : match)
  const taken = new Set(rows.map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
}

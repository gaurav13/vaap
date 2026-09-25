import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import discovered from "@/lib/core-routes.generated.json"

export const HIDDEN_CORE_ROUTES_KEY = "hiddenCoreRoutes"

export type CoreRoute = { label: string; href: string }

const LABEL_OVERRIDES: Record<string, string> = {
  "/": "Home",
  "/knowledge": "Knowledge Hub",
  "/membership/verify": "Verify Membership",
  "/membership/apply": "Apply for Membership",
  "/voting/active": "Active Votes",
  "/voting/upcoming": "Upcoming Votes",
  "/voting/results": "Voting Results",
  "/voting/guidelines": "Voting Guidelines",
  "/voting/verify": "Verify a Vote",
}

function labelFor(href: string): string {
  if (LABEL_OVERRIDES[href]) return LABEL_OVERRIDES[href]
  const last = href.split("/").filter(Boolean).pop() ?? ""
  return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getAllCoreRoutes(): CoreRoute[] {
  return (discovered as string[]).map((href) => ({ href, label: labelFor(href) }))
}

export async function getHiddenCoreRoutes(): Promise<string[]> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, HIDDEN_CORE_ROUTES_KEY)).limit(1)
    const parsed = row ? JSON.parse(row.value) : []
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []
  } catch {
    return []
  }
}

export async function getCoreRouteState() {
  const hidden = new Set(await getHiddenCoreRoutes())
  const all = getAllCoreRoutes()
  return {
    visible: all.filter((r) => !hidden.has(r.href)),
    hidden: all.filter((r) => hidden.has(r.href)),
    hiddenSet: hidden,
  }
}

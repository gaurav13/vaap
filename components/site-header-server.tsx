import { SiteHeader } from "@/components/site-header"
import { getMenuItems, getNewsAlert } from "@/lib/site-settings"
import { getHeaderUser } from "@/lib/header-user"
import type { HeaderUser } from "@/lib/header-user"

// Server wrapper that feeds the settings-driven nav (and current user) into the
// client SiteHeader. Use this in server pages instead of <SiteHeader> directly.
export async function SiteHeaderServer({
  variant = "solid",
  active,
  user,
}: {
  variant?: "overlay" | "solid"
  active?: string
  user?: HeaderUser
}) {
  const [nav, resolvedUser, newsAlert] = await Promise.all([
    getMenuItems(),
    user !== undefined ? Promise.resolve(user) : getHeaderUser(),
    getNewsAlert(),
  ])
  return <SiteHeader variant={variant} active={active} user={resolvedUser} nav={nav} newsAlert={newsAlert} />
}

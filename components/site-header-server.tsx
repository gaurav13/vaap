import { SiteHeader } from "@/components/site-header"
import { getMenuItems, getNewsAlert, getSiteStatus } from "@/lib/site-settings"
import { getHeaderUser } from "@/lib/header-user"
import type { HeaderUser } from "@/lib/header-user"
import { getSession } from "@/lib/session"
import { isElevated } from "@/lib/permissions"

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
  const [nav, resolvedUser, newsAlert, status, session] = await Promise.all([
    getMenuItems(),
    user !== undefined ? Promise.resolve(user) : getHeaderUser(),
    getNewsAlert(),
    getSiteStatus(),
    getSession(),
  ])
  // During "Coming Soon" mode, public visitors reach only the launch page and
  // the membership application. On the reachable application page we strip the
  // nav (menu, search, Join VAAP) so visitors can't jump to gated routes — only
  // the logo and Member Login remain. Elevated staff/committee keep the full nav.
  const launchMinimal = status.comingSoon && !isElevated(session?.user?.role)
  return (
    <SiteHeader
      variant={variant}
      active={active}
      user={resolvedUser}
      nav={nav}
      newsAlert={newsAlert}
      launchMinimal={launchMinimal}
    />
  )
}

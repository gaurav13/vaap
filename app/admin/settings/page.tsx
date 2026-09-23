import { db } from "@/lib/db"
import { pages } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getSiteSettings, type MenuItem } from "@/lib/site-settings"
import { getSession } from "@/lib/session"
import { SettingsAdmin } from "@/components/admin/settings-admin"
import { DeployPanel } from "@/components/admin/deploy-panel"

export default async function AdminSettingsPage() {
  const [settings, publishedPages, session] = await Promise.all([
    getSiteSettings(),
    db.select().from(pages).where(eq(pages.status, "published")),
    getSession(),
  ])

  const canManageStatus = session?.user?.role === "admin"

  const pageOptions: MenuItem[] = publishedPages.map((p) => ({
    label: p.title,
    href: `/${p.parentSlug ? `${p.parentSlug}/` : ""}${p.slug}`,
  }))

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Website Settings</h1>
      <p className="mt-1 text-muted-2">Manage the navigation menu, banners, social links, and general site settings.</p>
      {canManageStatus && <DeployPanel />}
      <SettingsAdmin
        menu={settings.menu}
        social={settings.social}
        general={settings.general}
        banner={settings.banner}
        newsAlert={settings.newsAlert}
        govHero={settings.govHero}
        govFramework={settings.govFramework}
        membership={settings.membership}
        footer={settings.footer}
        ctaBanner={settings.ctaBanner}
        siteStatus={settings.siteStatus}
        canManageStatus={canManageStatus}
        pageOptions={pageOptions}
      />
    </div>
  )
}

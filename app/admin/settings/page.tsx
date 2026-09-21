import { db } from "@/lib/db"
import { pages } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getSiteSettings, type MenuItem } from "@/lib/site-settings"
import { SettingsAdmin } from "@/components/admin/settings-admin"

export default async function AdminSettingsPage() {
  const [settings, publishedPages] = await Promise.all([
    getSiteSettings(),
    db.select().from(pages).where(eq(pages.status, "published")),
  ])

  const pageOptions: MenuItem[] = publishedPages.map((p) => ({
    label: p.title,
    href: `/${p.parentSlug ? `${p.parentSlug}/` : ""}${p.slug}`,
  }))

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Website Settings</h1>
      <p className="mt-1 text-muted-2">Manage the navigation menu, banners, social links, and general site settings.</p>
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
        pageOptions={pageOptions}
      />
    </div>
  )
}

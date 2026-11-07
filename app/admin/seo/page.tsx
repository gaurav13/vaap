import Link from "next/link"
import { Settings } from "lucide-react"
import { getSession } from "@/lib/session"
import { getSeoCatalog } from "@/lib/seo/catalog"
import { SeoDashboard } from "@/components/admin/seo/seo-dashboard"

export const dynamic = "force-dynamic"
export const metadata = { title: "SEO", robots: { index: false, follow: false } }

export default async function AdminSeoPage() {
  const [items, session] = await Promise.all([getSeoCatalog(), getSession()])
  const isSuperAdmin = session?.user?.role === "admin"

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-heading">SEO</h1>
          <p className="mt-1 max-w-2xl text-muted-2">
            Titles, descriptions, share images and structured data for every public page. Values are generated from your
            content automatically; edit a page to override them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-medium text-body hover:border-green-border hover:text-green"
          >
            sitemap.xml
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-medium text-body hover:border-green-border hover:text-green"
          >
            robots.txt
          </a>
          {isSuperAdmin && (
            <Link
              href="/admin/seo/settings"
              className="inline-flex items-center gap-1.5 rounded-lg bg-green px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Settings className="size-4" aria-hidden /> Global settings
            </Link>
          )}
        </div>
      </div>
      <SeoDashboard items={items} />
    </div>
  )
}

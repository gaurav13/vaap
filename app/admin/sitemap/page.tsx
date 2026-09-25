import Link from "next/link"
import { ExternalLink, FileText, Globe, Pencil, ChevronRight, Newspaper } from "lucide-react"
import { getSiteSettings } from "@/lib/site-settings"
import { getAllPages } from "@/app/actions/cms"
import { getPublishedNews } from "@/app/actions/public"

export const dynamic = "force-dynamic"

const CORE_ROUTES: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Membership", href: "/membership" },
  { label: "Governance", href: "/governance" },
  { label: "Voting", href: "/voting" },
  { label: "Active Votes", href: "/voting/active" },
  { label: "Upcoming Votes", href: "/voting/upcoming" },
  { label: "Voting Results", href: "/voting/results" },
  { label: "Voting Guidelines", href: "/voting/guidelines" },
  { label: "Voting Register", href: "/voting/register" },
  { label: "Verify a Vote", href: "/voting/verify" },
  { label: "Elections", href: "/voting/elections" },
  { label: "Committees", href: "/committees" },
  { label: "Ecosystem", href: "/ecosystem" },
  { label: "Knowledge Hub", href: "/knowledge" },
  { label: "Community", href: "/community" },
  { label: "News", href: "/news" },
  { label: "Events", href: "/events" },
  { label: "Contact", href: "/contact" },
  { label: "Verify Membership", href: "/membership/verify" },
]

function ViewLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-line bg-background px-2.5 py-1 text-xs font-medium text-body transition-colors hover:border-green-border hover:text-green"
    >
      <ExternalLink className="size-3.5" /> View
    </a>
  )
}

export default async function AdminSitemapPage() {
  const [settings, allPages, posts] = await Promise.all([
    getSiteSettings(),
    getAllPages(),
    getPublishedNews(),
  ])

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Sitemap</h1>
      <p className="mt-1 text-muted-2">
        A live map of your website — navigation menu structure, published CMS pages, and core pages. Each entry links
        directly to its live page.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Navigation menu tree */}
        <section className="rounded-xl border border-line bg-card p-6">
          <div className="flex items-center gap-2">
            <Globe className="size-5 text-green" />
            <h2 className="text-lg font-bold text-heading">Navigation menu</h2>
          </div>
          <p className="mt-1 text-sm text-muted-2">
            The header/footer menu. Manage it under{" "}
            <Link href="/admin/settings" className="font-medium text-green hover:underline">
              Website Settings
            </Link>
            .
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {settings.menu.length === 0 && <li className="text-sm text-muted-2">No menu items configured.</li>}
            {settings.menu.map((item, i) => (
              <li key={i} className="rounded-lg border border-line bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-heading">{item.label}</p>
                    <p className="truncate text-xs text-muted-2">{item.href}</p>
                  </div>
                  <ViewLink href={item.href} />
                </div>
                {(item.children?.length ?? 0) > 0 && (
                  <ul className="ml-3 mt-2 flex flex-col gap-1.5 border-l-2 border-line pl-3">
                    {item.children!.map((child, ci) => (
                      <li key={ci} className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <ChevronRight className="size-3.5 shrink-0 text-muted-2" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-body">{child.label}</p>
                            <p className="truncate text-xs text-muted-2">{child.href}</p>
                          </div>
                        </div>
                        <ViewLink href={child.href} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* CMS pages */}
        <section className="rounded-xl border border-line bg-card p-6">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-green" />
            <h2 className="text-lg font-bold text-heading">CMS pages</h2>
          </div>
          <p className="mt-1 text-sm text-muted-2">
            Dynamic pages you have created. Manage them under{" "}
            <Link href="/admin/pages" className="font-medium text-green hover:underline">
              Pages
            </Link>
            .
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {allPages.length === 0 && <li className="text-sm text-muted-2">No pages created yet.</li>}
            {allPages.map((p) => {
              const url = `/${p.parentSlug ? `${p.parentSlug}/` : ""}${p.slug}`
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-background p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-heading">{p.title}</p>
                      <span
                        className={
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
                          (p.status === "published" ? "bg-green/10 text-green" : "bg-muted text-muted-2")
                        }
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-2">{url}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      href="/admin/pages"
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-background px-2.5 py-1 text-xs font-medium text-body transition-colors hover:border-green-border hover:text-green"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </Link>
                    {p.status === "published" && <ViewLink href={url} />}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {/* News posts */}
      <section className="mt-6 rounded-xl border border-line bg-card p-6">
        <div className="flex items-center gap-2">
          <Newspaper className="size-5 text-green" />
          <h2 className="text-lg font-bold text-heading">News posts</h2>
        </div>
        <p className="mt-1 text-sm text-muted-2">
          Every published article, each at its own URL. Manage them under{" "}
          <Link href="/admin/news" className="font-medium text-green hover:underline">
            News
          </Link>
          .
        </p>

        <ul className="mt-4 grid gap-2 lg:grid-cols-2">
          {posts.length === 0 && <li className="text-sm text-muted-2">No published posts yet.</li>}
          {posts.map((post) => {
            const url = `/news/${post.id}`
            return (
              <li
                key={post.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-background p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-heading">{post.title}</p>
                  <p className="truncate text-xs text-muted-2">
                    {post.category ? `${post.category} · ` : ""}
                    {url}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href="/admin/news"
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-background px-2.5 py-1 text-xs font-medium text-body transition-colors hover:border-green-border hover:text-green"
                  >
                    <Pencil className="size-3.5" /> Edit
                  </Link>
                  <ViewLink href={url} />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Core routes */}
      <section className="mt-6 rounded-xl border border-line bg-card p-6">
        <div className="flex items-center gap-2">
          <Globe className="size-5 text-green" />
          <h2 className="text-lg font-bold text-heading">Core pages</h2>
        </div>
        <p className="mt-1 text-sm text-muted-2">Built-in pages that always exist on the site.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CORE_ROUTES.map((r) => (
            <div key={r.href} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-background p-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-heading">{r.label}</p>
                <p className="truncate text-xs text-muted-2">{r.href}</p>
              </div>
              <ViewLink href={r.href} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

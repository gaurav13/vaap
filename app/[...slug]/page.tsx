import { notFound } from "next/navigation"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PageHero } from "@/components/page-hero"
import { getHeaderUser } from "@/lib/header-user"
import { getCmsPage } from "@/app/actions/cms"
import { getSession, isStaff } from "@/lib/session"
import { RichContent } from "@/components/rich-content"
import { seoMetadata } from "@/lib/seo"
import { cmsSubject } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"

type Params = { slug: string[] }

export const dynamic = "force-dynamic"

// Top-level segments owned by real routes/handlers. A CMS page must never
// shadow these, so we bail out early and let Next.js 404 (or the real route win).
const RESERVED = new Set([
  "admin",
  "dashboard",
  "api",
  "sign-in",
  "sign-up",
  "login",
  "p",
  "_next",
])

function resolve(slug: string[]) {
  const leaf = slug[slug.length - 1]
  const parent = slug.length > 1 ? slug[slug.length - 2] : null
  return { leaf, parent }
}

async function loadPage(slug: string[]) {
  if (RESERVED.has(slug[0])) return null
  const { leaf, parent } = resolve(slug)
  const session = await getSession()
  return getCmsPage(leaf, parent, { includeDrafts: isStaff(session?.user?.role) })
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const page = await loadPage(slug)
  if (!page) return { title: "Not found" }
  const metadata = await seoMetadata(cmsSubject(page))
  return page.status === "draft" ? { ...metadata, robots: { index: false, follow: false } } : metadata
}

export default async function CmsPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const page = await loadPage(slug)
  if (!page) notFound()
  const user = await getHeaderUser()

  return (
    <>
      {page.status !== "draft" && <SeoJsonLd subject={cmsSubject(page)} />}
      <SiteHeaderServer user={user} />
      <main>
        {page.status === "draft" && (
          <p className="bg-[#F4E9CE] px-5 py-2.5 text-center text-sm font-semibold text-[#7A5B12]">
            Draft preview. Visitors see a 404 until this page is published.
          </p>
        )}
        <PageHero
          eyebrow={page.parentSlug ?? "VAAP"}
          title={page.heroTitle || page.title}
          description={page.heroSubtitle}
          image={page.heroImage}
        />
        <article className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-20">
          {page.content.trim().length === 0 ? (
            <p className="text-body">Content coming soon.</p>
          ) : (
            <RichContent value={page.content} />
          )}
        </article>
      </main>
      <SiteFooter />
    </>
  )
}

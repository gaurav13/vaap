import { notFound } from "next/navigation"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PageHero } from "@/components/page-hero"
import { getHeaderUser } from "@/lib/header-user"
import { getPublishedPage } from "@/app/actions/cms"

type Params = { slug: string[] }

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

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  if (RESERVED.has(slug[0])) return { title: "Not found | VAAP" }
  const { leaf, parent } = resolve(slug)
  const page = await getPublishedPage(leaf, parent)
  if (!page) return { title: "Not found | VAAP" }
  return {
    title: page.seoTitle || `${page.title} | VAAP`,
    description: page.metaDescription || page.heroSubtitle,
  }
}

export default async function CmsPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  if (RESERVED.has(slug[0])) notFound()

  const { leaf, parent } = resolve(slug)
  const [page, user] = await Promise.all([getPublishedPage(leaf, parent), getHeaderUser()])
  if (!page) notFound()

  const isHtml = /<[a-z][\s\S]*>/i.test(page.content)
  const paragraphs = page.content.split(/\n{2,}/).filter(Boolean)

  return (
    <>
      <SiteHeaderServer user={user} />
      <main>
        <PageHero
          eyebrow={page.parentSlug ?? "VAAP"}
          title={page.heroTitle || page.title}
          description={page.heroSubtitle}
        />
        <article className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-20">
          {page.content.trim().length === 0 ? (
            <p className="text-body">Content coming soon.</p>
          ) : isHtml ? (
            <div
              className="text-pretty leading-relaxed text-body [&_a]:text-green [&_a]:underline [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-heading [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-heading [&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:font-semibold [&_h4]:text-heading [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_strong]:font-semibold [&_strong]:text-heading [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          ) : (
            <div className="flex flex-col gap-5">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-pretty leading-relaxed text-body">
                  {p}
                </p>
              ))}
            </div>
          )}
        </article>
      </main>
      <SiteFooter />
    </>
  )
}

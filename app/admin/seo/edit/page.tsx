import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getOrgSameAs } from "@/lib/seo"
import { getSeoGlobals } from "@/lib/seo/config"
import { evaluateSubject, getSeoEntryRaw, getSeoSubject } from "@/lib/seo/catalog"
import { resolveSeo } from "@/lib/seo/resolve"
import { SEO_KIND_LABELS } from "@/lib/seo/shared"
import { SeoEditor } from "@/components/admin/seo/seo-editor"

export const dynamic = "force-dynamic"
export const metadata = { title: "Edit SEO", robots: { index: false, follow: false } }

export default async function EditSeoPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams
  if (!key) notFound()
  const [subject, override, globals, sameAs] = await Promise.all([
    getSeoSubject(key),
    getSeoEntryRaw(key),
    getSeoGlobals(),
    getOrgSameAs(),
  ])
  if (!subject) notFound()

  const defaults = resolveSeo(subject, null, globals)
  const { jsonLd, issues } = evaluateSubject(subject, override, globals, sameAs)

  return (
    <div>
      <Link href="/admin/seo" className="inline-flex items-center gap-1 text-sm font-medium text-green hover:underline">
        <ChevronLeft className="size-4" aria-hidden /> All pages
      </Link>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-2">{SEO_KIND_LABELS[subject.kind]}</p>
      <h1 className="font-serif text-2xl font-bold text-heading text-balance">{subject.label}</h1>
      <p className="mt-1 text-sm text-muted-2">{subject.path}</p>
      <SeoEditor
        key={override?.updatedAt ? String(override.updatedAt) : "new"}
        seoKey={subject.key}
        kind={subject.kind}
        path={subject.path}
        siteUrl={globals.siteUrl}
        siteName={globals.siteName}
        defaults={defaults}
        override={override}
        issues={issues}
        jsonLd={JSON.stringify(jsonLd, null, 2)}
      />
    </div>
  )
}

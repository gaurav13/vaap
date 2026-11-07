import { loadSeo, type SeoSubject } from "@/lib/seo"

/** Server-rendered JSON-LD for a page, so crawlers see it in the initial HTML. */
export async function SeoJsonLd({ subject }: { subject: SeoSubject }) {
  const { jsonLd } = await loadSeo(subject)
  return (
    <script
      type="application/ld+json"
      // Escape "<" so content can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  )
}

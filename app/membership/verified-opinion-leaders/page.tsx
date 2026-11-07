import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { KolHero } from "@/components/kol/kol-hero"
import { KolDirectory, type PublicKolCard } from "@/components/kol/kol-directory"
import { getPublicKols, totalFollowers } from "@/lib/kol"
import { seoMetadata } from "@/lib/seo"
import { staticSubjectByPath } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"

export const dynamic = "force-dynamic"

export function generateMetadata() {
  return seoMetadata(staticSubjectByPath('/membership/verified-opinion-leaders'))
}

export default async function KolDirectoryPage() {
  const kols = await getPublicKols()
  const cards: PublicKolCard[] = kols.map((k) => ({
    slug: k.slug,
    name: k.professionalName || k.fullName,
    title: k.title,
    organization: k.organization,
    photo: k.photo,
    expertise: k.expertise,
    platforms: k.platforms.map((p) => ({ platform: p.platform, followers: Number(p.followers) || 0 })),
  }))
  const categories = [...new Set(kols.flatMap((k) => k.expertise))].sort()
  const reach = kols.reduce((sum, k) => sum + totalFollowers(k), 0)

  return (
    <>
      <SeoJsonLd subject={staticSubjectByPath('/membership/verified-opinion-leaders')} />
    <>
      <SiteHeaderServer />
      <main className="bg-background">
        <KolHero leaders={kols.length} reach={reach} sectors={categories.length} />
        <KolDirectory kols={cards} categories={categories} />
      </main>
      <SiteFooter />
    </>
    </>
  )
}

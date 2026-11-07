import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { AboutHero } from "@/components/about/about-hero"
import { MissionVision } from "@/components/about/mission-vision"
import { Leadership } from "@/components/about/leadership"
import { getHeaderUser } from "@/lib/header-user"
import { getLeadership } from "@/app/actions/cms"
import { seoMetadata } from "@/lib/seo"
import { staticSubjectByPath } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"

export function generateMetadata() {
  return seoMetadata(staticSubjectByPath('/about'))
}

export default async function AboutPage() {
  const [user, profiles] = await Promise.all([getHeaderUser(), getLeadership()])
  return (
    <>
      <SeoJsonLd subject={staticSubjectByPath('/about')} />
    <>
      <SiteHeaderServer active="About" user={user} />
      <main>
        <AboutHero />
        <MissionVision />
        <Leadership profiles={profiles} />
      </main>
      <SiteFooter />
    </>
    </>
  )
}

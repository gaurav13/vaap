import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { getCommittees } from "@/app/actions/cms"
import { getCommitteeNews } from "@/app/actions/public"
import { CommitteesHero } from "@/components/committees/committees-hero"
import { CommitteesGrid } from "@/components/committees/committees-grid"
import { CommitteeUpdates } from "@/components/committees/committee-updates"
import { CommitteeCta } from "@/components/committees/committee-cta"
import { seoMetadata } from "@/lib/seo"
import { staticSubjectByPath } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"

export function generateMetadata() {
  return seoMetadata(staticSubjectByPath('/working-groups'))
}

export default async function CommitteesPage() {
  const [user, committees, committeeNews] = await Promise.all([
    getHeaderUser(),
    getCommittees(),
    getCommitteeNews(3),
  ])

  const nameById = new Map(committees.map((c) => [c.id, c.name]))
  const posts = committeeNews.map((n) => ({
    id: n.id,
    title: n.title,
    excerpt: n.excerpt,
    image: n.image,
    committeeName: n.committeeId ? nameById.get(n.committeeId) ?? null : null,
    createdAt: n.createdAt.toISOString(),
  }))

  return (
    <>
      <SeoJsonLd subject={staticSubjectByPath('/working-groups')} />
    <>
      <SiteHeaderServer active="Working Groups" user={user} />
      <main>
        <CommitteesHero />
        <CommitteesGrid
          committees={committees.map((c) => ({
            id: c.id,
            name: c.name,
            headName: c.headName,
            headTitle: c.headTitle,
            headPhoto: c.headPhoto,
            headLinkedin: c.headLinkedin,
          }))}
        />
        <CommitteeUpdates posts={posts} />
        <CommitteeCta />
      </main>
      <SiteFooter />
    </>
    </>
  )
}

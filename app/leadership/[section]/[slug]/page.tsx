import { notFound, permanentRedirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { leadership } from "@/lib/db/schema"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { seoMetadata } from "@/lib/seo"
import { teamSubject } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"
import { LeadershipProfileView } from "@/components/leadership/profile-view"
import { PROFILE_FIELDS, leaderPath, type ProfileContent } from "@/lib/leadership"

type Params = Promise<{ section: string; slug: string }>

async function getProfile(slug: string) {
  const [row] = await db
    .select()
    .from(leadership)
    .where(and(eq(leadership.slug, slug), eq(leadership.published, true)))
    .limit(1)
  return row ?? null
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const profile = await getProfile(slug)
  if (!profile) return { title: "Profile" }
  return seoMetadata(teamSubject(profile))
}

export default async function LeadershipProfilePage({ params }: { params: Params }) {
  const { section, slug } = await params
  const [profile, user] = await Promise.all([getProfile(slug), getHeaderUser()])
  if (!profile) notFound()

  const canonical = leaderPath(profile)
  if (canonical !== `/leadership/${section}/${slug}`) permanentRedirect(canonical)

  // Only public template fields reach the view; private contact data stays server-side.
  const content = Object.fromEntries(PROFILE_FIELDS.map((f) => [f, String(profile[f] ?? "")])) as ProfileContent

  return (
    <>
      <SeoJsonLd subject={teamSubject(profile)} />
      <SiteHeaderServer active="About" user={user} />
      <main>
        <LeadershipProfileView profile={content} />
      </main>
      <SiteFooter />
    </>
  )
}

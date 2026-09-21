import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { AboutHero } from "@/components/about/about-hero"
import { MissionVision } from "@/components/about/mission-vision"
import { Leadership } from "@/components/about/leadership"
import { getHeaderUser } from "@/lib/header-user"
import { getLeadership } from "@/app/actions/cms"

export const metadata = {
  title: "About | VAAP",
  description:
    "The Virtual Assets Association of Pakistan (VAAP) is a collective voice for Pakistan's virtual asset industry, supporting responsible growth, collaboration, education, and innovation.",
}

export default async function AboutPage() {
  const [user, profiles] = await Promise.all([getHeaderUser(), getLeadership()])
  return (
    <>
      <SiteHeaderServer active="About" user={user} />
      <main>
        <AboutHero />
        <MissionVision />
        <Leadership profiles={profiles} />
      </main>
      <SiteFooter />
    </>
  )
}

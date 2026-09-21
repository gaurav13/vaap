import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { getLeadership } from "@/app/actions/cms"
import { Leadership } from "@/components/about/leadership"

export const metadata = {
  title: "Team | VAAP",
  description:
    "Meet the VAAP team — the Chairman and Executive Committee driving the growth, development and responsible adoption of virtual assets in Pakistan.",
}

export default async function TeamPage() {
  const [user, leadership] = await Promise.all([getHeaderUser(), getLeadership("committee")])

  const profiles = leadership.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    organization: p.organization,
    bio: p.bio,
    photo: p.photo,
    linkedin: p.linkedin,
    kind: p.kind,
  }))

  return (
    <>
      <SiteHeaderServer active="Team" user={user} />
      <main>
        <section className="border-b border-line-light bg-mint-2">
          <div className="vaap-container py-12 lg:py-16">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-green" aria-hidden="true" />
                <span className="text-xs font-semibold tracking-[0.2em] text-green">OUR TEAM</span>
              </div>
              <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-heading text-balance lg:text-5xl">
                Meet the Team
              </h1>
              <p className="mt-4 text-pretty leading-relaxed text-muted-2">
                The people behind VAAP — our Chairman and Executive Committee. Select any member to view their
                position, background and links.
              </p>
            </div>
          </div>
        </section>
        <Leadership profiles={profiles} />
      </main>
      <SiteFooter />
    </>
  )
}

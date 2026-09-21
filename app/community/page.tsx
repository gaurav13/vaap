import Link from "next/link"
import { Handshake, Lightbulb, Network, Users } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PageHero } from "@/components/page-hero"
import { Button } from "@/components/ui/button"
import { getHeaderUser } from "@/lib/header-user"

export const metadata = {
  title: "Community | VAAP",
  description: "Join a growing community building Pakistan's virtual asset ecosystem.",
}

const BENEFITS = [
  { icon: Network, title: "Network with Industry", desc: "Connect with leaders, builders, and peers across the ecosystem." },
  { icon: Handshake, title: "Access Opportunities", desc: "Discover partnerships, events, and collaboration opportunities." },
  { icon: Lightbulb, title: "Contribute to Policy", desc: "Help shape responsible virtual asset policy in Pakistan." },
  { icon: Users, title: "Support Innovation", desc: "Back the startups and ideas driving the industry forward." },
]

export default async function CommunityPage() {
  const user = await getHeaderUser()
  return (
    <>
        <SiteHeaderServer active="Community" user={user} />
      <main>
        <PageHero
          eyebrow="Community"
          title="Be part of a more inclusive and innovative Pakistan"
          description="Join VAAP today and contribute to a responsible, transparent, and globally connected virtual asset ecosystem."
        />
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-line bg-card p-6">
                <span className="flex size-11 items-center justify-center rounded-full bg-mint text-green">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-bold text-heading">{title}</h3>
                <p className="mt-1.5 text-sm text-body">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-line bg-mint/40 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-heading">Ready to get involved?</h2>
              <p className="mt-1 text-body">Apply for membership and join the community today.</p>
            </div>
            <Button asChild size="lg">
              <Link href="/membership">Join VAAP</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

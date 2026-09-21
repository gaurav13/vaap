import { Banknote, Building2, Cpu, Globe, Scale, Rocket } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PageHero } from "@/components/page-hero"
import { getHeaderUser } from "@/lib/header-user"

export const metadata = {
  title: "Ecosystem | VAAP",
  description: "Explore the virtual asset ecosystem VAAP represents and connects.",
}

const SEGMENTS = [
  { icon: Building2, title: "Exchanges & Custodians", desc: "Platforms enabling secure trading and safekeeping of digital assets." },
  { icon: Rocket, title: "Startups & Builders", desc: "Teams building Web3 infrastructure, wallets, and applications." },
  { icon: Banknote, title: "Financial Services", desc: "Payments, remittances, and fintech bridging traditional and digital finance." },
  { icon: Scale, title: "Legal & Compliance", desc: "Advisors helping the industry meet regulatory and AML standards." },
  { icon: Cpu, title: "Technology Providers", desc: "Blockchain, security, and analytics vendors powering the ecosystem." },
  { icon: Globe, title: "Global Partners", desc: "International organizations collaborating with Pakistan's market." },
]

export default async function EcosystemPage() {
  const user = await getHeaderUser()
  return (
    <>
        <SiteHeaderServer active="Ecosystem" user={user} />
      <main>
        <PageHero
          eyebrow="Ecosystem"
          title="A connected virtual asset ecosystem"
          description="VAAP maps and connects every part of Pakistan's digital asset landscape, from exchanges and startups to regulators and global partners."
        />
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SEGMENTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-line bg-card p-6">
                <span className="flex size-11 items-center justify-center rounded-full bg-mint text-green">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-bold text-heading">{title}</h3>
                <p className="mt-1.5 text-sm text-body">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

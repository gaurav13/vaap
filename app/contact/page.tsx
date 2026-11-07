import { Mail, MapPin } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PageHero } from "@/components/page-hero"
import { ContactForm } from "@/components/contact-form"
import { getHeaderUser } from "@/lib/header-user"
import { CONTACT_ADDRESS, CONTACT_EMAIL } from "@/lib/contact"
import { seoMetadata } from "@/lib/seo"
import { staticSubjectByPath } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"

export function generateMetadata() {
  return seoMetadata(staticSubjectByPath('/contact'))
}

export default async function ContactPage() {
  const user = await getHeaderUser()
  return (
    <>
      <SeoJsonLd subject={staticSubjectByPath('/contact')} />
    <>
        <SiteHeaderServer active="Contact" user={user} />
      <main>
        <PageHero
          eyebrow="Contact"
          title="Get in touch with VAAP"
          description="Questions about membership, partnerships, or policy? We'd love to hear from you."
        />

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
          <div className="grid gap-5">
            {[
              { icon: Mail, label: "Email", value: CONTACT_EMAIL },
              { icon: MapPin, label: "Address", value: CONTACT_ADDRESS },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4 rounded-xl border border-line bg-card p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mint text-green">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-heading">{label}</p>
                  <p className="mt-0.5 text-sm text-body">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <ContactForm />
        </section>
      </main>
      <SiteFooter />
    </>
    </>
  )
}

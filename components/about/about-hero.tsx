import Image from "next/image"

export function AboutHero() {
  return (
    <section className="border-b border-line-light bg-mint-2">
      <div className="vaap-container py-8 lg:py-12">
        <div className="relative w-full overflow-hidden rounded-2xl">
          {/* Mobile: portrait banner so the baked-in text stays readable */}
          <Image
            src="/images/about/about-hero-banner-mobile.png"
            alt="About Us — A Collective Voice for Pakistan's Virtual Asset Industry. The Virtual Assets Association of Pakistan (VAAP) brings together companies, startups, professionals, community leaders, and industry stakeholders to support responsible growth, collaboration, education, and innovation across Pakistan's virtual asset ecosystem."
            width={1200}
            height={1600}
            priority
            sizes="100vw"
            className="h-auto w-full md:hidden"
          />
          {/* Desktop / tablet: wide banner */}
          <Image
            src="/images/about/about-hero-banner.png"
            alt=""
            aria-hidden="true"
            width={2131}
            height={738}
            priority
            sizes="(max-width: 1280px) 100vw, 1200px"
            className="hidden h-auto w-full md:block"
          />
        </div>
      </div>
    </section>
  )
}

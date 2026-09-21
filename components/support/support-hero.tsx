import Image from "next/image"

export function SupportHero() {
  return (
    <section aria-labelledby="support-hero-heading" className="relative isolate bg-background">
      <h1 id="support-hero-heading" className="sr-only">
        Stop Scams. Stay Secure. Get Support. Helping virtual asset users identify scams, protect their digital assets,
        report concerns, and access trusted guidance from the VAAP community.
      </h1>

      {/* Full-bleed banner. The container keeps the image aspect ratio so the
          transparent CTA overlays stay aligned with the baked-in buttons at every width. */}
      <div className="relative mx-auto aspect-[2048/759] w-full max-w-[1600px]">
        <Image
          src="/images/support-hero-banner.png"
          alt="VAAP — Virtual Assets Association of Pakistan. Stop Scams. Stay Secure. Get Support. A green security shield with a padlock surrounded by Bitcoin, Ethereum and Tether coins, set against the Faisal Mosque, Margalla hills and the Pakistan flag in Islamabad."
          fill
          priority
          sizes="100vw"
          className="object-contain"
        />

        {/* Transparent clickable overlays over the two CTA buttons in the artwork */}
        <a
          href="#complaint"
          aria-label="Report a Scam or Concern"
          className="absolute left-[5.4%] top-[64%] h-[10%] w-[19%] rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
        >
          <span className="sr-only">Report a Scam or Concern</span>
        </a>
        <a
          href="#complaint"
          aria-label="Get Support"
          className="absolute left-[25.7%] top-[64%] h-[10%] w-[10.6%] rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
        >
          <span className="sr-only">Get Support</span>
        </a>
      </div>
    </section>
  )
}

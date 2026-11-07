import { VaapLogo } from './vaap-logo'
import { FooterNewsletter } from './footer-newsletter'
import { CtaBanner } from './cta-banner'
import { getSiteSettings } from '@/lib/site-settings'
import { CONTACT_ADDRESS, CONTACT_EMAIL } from '@/lib/contact'
import { Mail, MapPin } from 'lucide-react'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon, XIcon, YoutubeIcon } from '@/components/social-icons'

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">{children}</h3>
      <span className="mt-3 block h-px w-10 bg-gold" aria-hidden="true" />
    </div>
  )
}

export async function SiteFooter() {
  const { social, general, footer, ctaBanner } = await getSiteSettings()
  const socials: { Icon: (p: { className?: string }) => React.ReactElement; href: string; label: string }[] = [
    { Icon: LinkedinIcon, href: social.linkedin, label: 'LinkedIn' },
    { Icon: XIcon, href: social.x, label: 'X' },
    { Icon: YoutubeIcon, href: social.youtube, label: 'YouTube' },
    { Icon: InstagramIcon, href: social.instagram, label: 'Instagram' },
    { Icon: FacebookIcon, href: social.facebook, label: 'Facebook' },
    { Icon: TiktokIcon, href: social.tiktok, label: 'TikTok' },
  ].filter((s) => s.href)

  return (
    <>
      <CtaBanner data={ctaBanner} />
      <footer className="relative overflow-hidden bg-navy-dark text-white">
      {/* Landmark silhouette backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-right-bottom bg-no-repeat opacity-[0.12] lg:block"
        style={{
          backgroundImage: "url('/images/pakistan-skyline-watermark.png')",
          backgroundSize: 'contain',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:gap-12">
          {/* Brand column */}
          <div className="max-w-sm">
            <VaapLogo onDark height={60} />
            <p className="mt-6 font-serif text-2xl font-bold text-white">{footer.tagline}</p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{footer.description}</p>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-white/70">
              <li className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-gold" aria-hidden="true" />
                <span className="sr-only">Email:</span>
                <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-green">
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
                <span className="sr-only">Address:</span>
                <address className="not-italic leading-relaxed">{CONTACT_ADDRESS}</address>
              </li>
            </ul>
            {socials.length > 0 && (
              <div className="mt-6 flex items-center gap-3">
                {socials.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-green hover:text-white"
                    aria-label={label}
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <nav aria-label={footer.quickLinksHeading}>
            <ColumnHeading>{footer.quickLinksHeading}</ColumnHeading>
            <ul className="mt-5 flex flex-col gap-3">
              {footer.quickLinks.map((item) => (
                <li key={item.label + item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-green"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Useful Resources */}
          <nav aria-label={footer.resourcesHeading}>
            <ColumnHeading>{footer.resourcesHeading}</ColumnHeading>
            <ul className="mt-5 flex flex-col gap-3">
              {footer.resources.map((item) => (
                <li key={item.label + item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-green"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Stay Updated */}
          <div>
            <ColumnHeading>{footer.newsletterHeading}</ColumnHeading>
            <p className="mt-5 text-sm leading-relaxed text-white/70">{footer.newsletterText}</p>
            <div className="mt-5">
              <FooterNewsletter cta={footer.newsletterCta} privacyNote={footer.privacyNote} />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-6 text-sm text-white/50 lg:flex-row lg:items-center lg:justify-between">
          <p className="order-2 lg:order-1">{general.copyright}</p>

          {footer.legal.length > 0 && (
            <nav className="order-1 flex flex-wrap items-center gap-x-4 gap-y-2 lg:order-2">
              {footer.legal.map((item, i) => (
                <span key={item.label + item.href} className="flex items-center gap-x-4">
                  <a href={item.href} className="transition-colors hover:text-white/80">
                    {item.label}
                  </a>
                  {i < footer.legal.length - 1 && (
                    <span className="text-white/20" aria-hidden="true">
                      |
                    </span>
                  )}
                </span>
              ))}
            </nav>
          )}

          {footer.brandTagline && (
            <div className="order-3 flex items-center gap-3">
              <span className="hidden h-px w-6 bg-gold lg:block" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                {footer.brandTagline}
              </span>
              <span className="hidden h-px w-6 bg-gold lg:block" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
      </footer>
    </>
  )
}

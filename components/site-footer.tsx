import { VaapLogo } from './vaap-logo'
import { FooterNewsletter } from './footer-newsletter'
import { CtaBanner } from './cta-banner'
import { getSiteSettings } from '@/lib/site-settings'

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.9 1.5h3.7l-8.1 9.2 9.5 12.6h-7.4l-5.8-7.6-6.7 7.6H.4l8.6-9.8L0 1.5h7.6l5.2 6.9 6.1-6.9Zm-1.3 19.8h2L6.5 3.6H4.4L17.6 21.3Z" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.12-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.52A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.12 2.13c1.88.52 9.38.52 9.38.52s7.5 0 9.38-.52a3 3 0 0 0 2.12-2.13A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16ZM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38A5.86 5.86 0 0 0 .63 4.14c-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.08 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.86 5.86 0 0 0 2.12-1.38 5.86 5.86 0 0 0 1.38-2.12c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.86 5.86 0 0 0-1.38-2.12A5.86 5.86 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4Zm6.41-10.4a1.44 1.44 0 1 1-1.44-1.44 1.44 1.44 0 0 1 1.44 1.44Z" />
    </svg>
  )
}

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
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:gap-12">
          {/* Brand column */}
          <div className="max-w-sm">
            <VaapLogo onDark height={60} />
            <p className="mt-6 font-serif text-2xl font-bold text-white">{footer.tagline}</p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{footer.description}</p>
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

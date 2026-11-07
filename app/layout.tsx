import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Miranda_Sans } from 'next/font/google'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSiteStatus } from '@/lib/site-settings'
import { getSession } from '@/lib/session'
import { isElevated } from '@/lib/permissions'
import { isLaunchExempt } from '@/lib/launch-gate'
import { SiteGate } from '@/components/site-gate'
import { getSeoGlobals } from '@/lib/seo/config'
import { absoluteUrl } from '@/lib/seo/resolve'
import './globals.css'

// While the site is in "Coming Soon" mode the public can only reach the launch
// page ("/"), the membership application ("/membership/apply") and the public
// membership verification tool ("/membership/verify" — certificates carry a QR
// code that deep-links here, so it must resolve even before launch). Every
// other public route redirects to the launch page. Exempt prefixes stay
// reachable so staff/committee can sign in and manage the launch toggle, and so
// the app's own API/auth endpoints keep working.
//
// The visual swap itself lives in <SiteGate>, which listens to the pathname.
// Doing it here would freeze the launch page on client navigations, because
// the root layout does not re-render when the URL changes.

const miranda = Miranda_Sans({
  subsets: ['latin'],
  variable: '--font-miranda',
  display: 'swap',
  style: ['normal', 'italic'],
})

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoGlobals()
  const image = absoluteUrl(seo.defaultOgImage, seo.siteUrl)
  return {
    metadataBase: new URL(seo.siteUrl),
    title: { default: `${seo.siteName} — ${seo.legalName}`, template: `%s${seo.titleSuffix}` },
    description: seo.defaultDescription,
    applicationName: seo.siteName,
    generator: 'v0.app',
    openGraph: {
      type: 'website',
      siteName: seo.siteName,
      locale: seo.locale,
      images: image ? [{ url: image, alt: seo.legalName }] : undefined,
    },
    twitter: { card: 'summary_large_image', images: image ? [image] : undefined, site: seo.twitterHandle || undefined },
    verification: {
      google: seo.googleVerification || undefined,
      other: seo.bingVerification ? { 'msvalidate.01': seo.bingVerification } : undefined,
    },
  }
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#00343a',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = (await headers()).get('x-pathname') ?? ''
  const [{ comingSoon }, session] = await Promise.all([getSiteStatus(), getSession()])
  const elevated = isElevated(session?.user?.role)
  // Full document loads of locked routes bounce to the launch page. Client
  // navigations are handled by SiteGate, which follows usePathname().
  if (comingSoon && !elevated && !isLaunchExempt(pathname) && pathname !== '/' && pathname !== '') {
    redirect('/')
  }
  return (
    <html lang="en" className={`${miranda.variable} bg-background`}>
      <body className="font-sans antialiased">
        <SiteGate comingSoon={comingSoon} elevated={elevated}>
          {children}
        </SiteGate>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

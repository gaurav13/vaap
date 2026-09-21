import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { headers } from 'next/headers'
import { getSiteStatus } from '@/lib/site-settings'
import { getSession } from '@/lib/session'
import { ComingSoon } from '@/components/coming-soon'
import './globals.css'

// Paths that stay reachable even while the site is in "Coming Soon" mode, so
// admins can sign in and manage the launch toggle.
const EXEMPT_PREFIXES = ['/admin', '/dashboard', '/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/api', '/membership/apply']

async function isComingSoonGated(pathname: string): Promise<boolean> {
  const exempt = EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (exempt) return false
  const { comingSoon } = await getSiteStatus()
  if (!comingSoon) return false
  // Staff and super-admins always see the live site.
  const session = await getSession()
  const role = session?.user?.role
  if (role === 'staff' || role === 'admin') return false
  return true
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  style: ['italic', 'normal'],
})

export const metadata: Metadata = {
  title: 'VAAP — Virtual Assets Association of Pakistan',
  description:
    'Building a responsible, innovative and connected virtual asset ecosystem for Pakistan. People. Innovation. Collaboration.',
  generator: 'v0.app',
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
  const gated = await isComingSoonGated(pathname)
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} bg-background`}>
      <body className="font-sans antialiased">
        {gated ? <ComingSoon /> : children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

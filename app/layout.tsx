import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSiteStatus } from '@/lib/site-settings'
import { getSession } from '@/lib/session'
import { isElevated } from '@/lib/permissions'
import { ComingSoon } from '@/components/coming-soon'
import './globals.css'

// While the site is in "Coming Soon" mode the public can only reach the launch
// page ("/"), the membership application ("/membership/apply") and the public
// membership verification tool ("/membership/verify" — certificates carry a QR
// code that deep-links here, so it must resolve even before launch). Every
// other public route redirects to the launch page. These prefixes stay
// reachable so staff/committee can sign in and manage the launch toggle, and so
// the app's own API/auth endpoints keep working.
const EXEMPT_PREFIXES = ['/admin', '/dashboard', '/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/api', '/membership/apply', '/membership/verify']

type GateDecision = 'allow' | 'coming-soon' | 'redirect'

async function resolveGate(pathname: string): Promise<GateDecision> {
  const exempt = EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (exempt) return 'allow'
  const { comingSoon } = await getSiteStatus()
  if (!comingSoon) return 'allow'
  // Signed-in staff and committee members always see the full live site.
  const session = await getSession()
  if (isElevated(session?.user?.role)) return 'allow'
  // The launch page itself renders inline; anything else redirects to it.
  return pathname === '/' ? 'coming-soon' : 'redirect'
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
  const gate = await resolveGate(pathname)
  if (gate === 'redirect') redirect('/')
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} bg-background`}>
      <body className="font-sans antialiased">
        {gate === 'coming-soon' ? <ComingSoon /> : children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

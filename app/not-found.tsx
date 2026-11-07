import Link from "next/link"

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
}

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/membership", label: "Membership" },
  { href: "/news", label: "News" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
]

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted px-5 py-20">
      <div className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-green">Error 404</p>
        <h1 className="text-balance text-4xl font-bold text-heading md:text-5xl">This page could not be found</h1>
        <p className="text-pretty leading-relaxed text-body">
          The link may be outdated or the page may have moved. Try one of these instead.
        </p>
        <nav aria-label="Helpful links" className="flex flex-wrap justify-center gap-3">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-heading transition-colors hover:border-green hover:text-green"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}

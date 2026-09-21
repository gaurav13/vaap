"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Menu, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { VaapLogo } from "./vaap-logo"
import { UserMenu } from "./user-menu"
import { NewsAlertBar } from "./news-alert"
import type { NewsAlert } from "@/lib/site-settings"

const NAV: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Governance", href: "/governance" },
  { label: "Committees", href: "/committees" },
  { label: "Membership", href: "/membership" },
  { label: "Ecosystem", href: "/ecosystem" },
  { label: "Knowledge", href: "/knowledge" },
  { label: "Media & Events", href: "/events" },
  { label: "Community", href: "/community" },
  { label: "Contact", href: "/contact" },
]

export type HeaderUser = {
  id: string
  name: string
  email: string
  role: "member" | "staff" | "admin"
} | null

type NavItem = { label: string; href: string; newTab?: boolean; children?: NavItem[] }

function isExternal(href: string) {
  return /^(https?:)?\/\//.test(href) || /^(mailto:|tel:)/.test(href)
}

// Renders a menu link as a plain anchor for external/custom URLs (or when the
// admin asked to open in a new tab) and a Next.js Link for internal routes.
function NavLink({
  item,
  className,
  onClick,
  children,
}: {
  item: NavItem
  className?: string
  onClick?: () => void
  children: React.ReactNode
}) {
  const external = isExternal(item.href)
  if (external || item.newTab) {
    return (
      <a
        href={item.href}
        onClick={onClick}
        target={item.newTab || external ? "_blank" : undefined}
        rel={item.newTab || external ? "noopener noreferrer" : undefined}
        className={className}
      >
        {children}
      </a>
    )
  }
  return (
    <Link href={item.href} onClick={onClick} className={className}>
      {children}
    </Link>
  )
}

export function SiteHeader({
  variant = "solid",
  active,
  user = null,
  nav = NAV,
  newsAlert = null,
}: {
  variant?: "overlay" | "solid"
  active?: string
  user?: HeaderUser
  nav?: NavItem[]
  newsAlert?: NewsAlert | null
}) {
  const [open, setOpen] = useState(false)
  const overlay = variant === "overlay"

  return (
    <header
      className={cn(
        overlay
          ? "absolute inset-x-0 top-0 z-50"
          : "sticky top-0 z-50 border-b border-line bg-gradient-to-b from-mint/60 to-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
      )}
    >
      <NewsAlertBar alert={newsAlert} />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 lg:px-8">
        <Link href="/" className="shrink-0">
          <VaapLogo onDark={overlay} height={60} />
          <span className="sr-only">VAAP Home</span>
        </Link>

        <nav className="hidden items-center gap-6 xl:flex">
          {nav.map((item) => {
            const isActive = active === item.label
            const children = item.children ?? []
            if (children.length > 0) {
              return (
                <div key={item.label} className="group relative">
                  <NavLink
                    item={item}
                    className={cn(
                      "relative flex items-center gap-1 text-sm font-medium transition-colors",
                      overlay ? "text-white/85 hover:text-white" : "text-body hover:text-navy",
                      isActive && "text-green",
                    )}
                  >
                    {item.label}
                    <ChevronDown className="size-3.5 transition-transform group-hover:rotate-180" />
                    {isActive && <span className="absolute -bottom-1.5 left-0 h-0.5 w-full rounded-full bg-green" />}
                  </NavLink>
                  <div className="invisible absolute left-1/2 top-full z-50 min-w-52 -translate-x-1/2 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
                    <div className="rounded-xl border border-line bg-background p-1.5 shadow-lg">
                      {children.map((child) => (
                        <NavLink
                          key={child.label}
                          item={child}
                          className="block rounded-lg px-3.5 py-2 text-sm font-medium text-body transition-colors hover:bg-mint hover:text-navy"
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <NavLink
                key={item.label}
                item={item}
                className={cn(
                  "relative text-sm font-medium transition-colors",
                  overlay ? "text-white/85 hover:text-white" : "text-body hover:text-navy",
                  isActive && "text-green",
                )}
              >
                {item.label}
                {isActive && <span className="absolute -bottom-1.5 left-0 h-0.5 w-full rounded-full bg-green" />}
              </NavLink>
            )
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Search"
            className={cn(
              "hidden size-9 items-center justify-center rounded-md transition-colors md:flex",
              overlay ? "text-white/85 hover:bg-white/10 hover:text-white" : "text-body hover:bg-mint hover:text-navy",
            )}
          >
            <Search className="size-5" />
          </button>

          {user ? (
            <UserMenu user={user} overlay={overlay} />
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(
                  "hidden rounded-lg border px-4 py-2 text-sm font-semibold transition-colors sm:inline-flex",
                  overlay
                    ? "border-white/40 text-white hover:bg-white/10"
                    : "border-navy/30 text-navy hover:bg-mint",
                )}
              >
                Member Login
              </Link>
              <Link
                href="/membership"
                className="hidden rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-hover sm:inline-flex"
              >
                Join VAAP
              </Link>
            </>
          )}

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex size-10 items-center justify-center rounded-md xl:hidden",
              overlay ? "text-white" : "text-navy",
            )}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-4 mb-2 rounded-xl border border-line bg-background p-4 shadow-lg xl:hidden">
          <nav className="flex flex-col">
            {nav.map((item) => (
              <div key={item.label}>
                <NavLink
                  item={item}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm font-medium text-body transition-colors hover:bg-mint hover:text-navy",
                    active === item.label && "text-green",
                  )}
                >
                  {item.label}
                </NavLink>
                {(item.children?.length ?? 0) > 0 && (
                  <div className="ml-3 flex flex-col border-l border-line pl-2">
                    {item.children!.map((child) => (
                      <NavLink
                        key={child.label}
                        item={child}
                        onClick={() => setOpen(false)}
                        className="block rounded-md px-3 py-2 text-sm text-muted-2 transition-colors hover:bg-mint hover:text-navy"
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-navy/30 px-4 py-2.5 text-center text-sm font-semibold text-navy"
                  >
                    Dashboard
                  </Link>
                  {(user.role === "staff" || user.role === "admin") && (
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="rounded-lg bg-green px-4 py-2.5 text-center text-sm font-semibold text-white"
                    >
                      Admin Panel
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-navy/30 px-4 py-2.5 text-center text-sm font-semibold text-navy"
                  >
                    Member Login
                  </Link>
                  <Link
                    href="/membership"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-green px-4 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Join VAAP
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

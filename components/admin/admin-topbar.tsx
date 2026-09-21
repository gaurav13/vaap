"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Bell, ChevronDown, Home, LogOut, Search } from "lucide-react"
import { authClient } from "@/lib/auth-client"

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function AdminTopbar({ name, role, notifications }: { name: string; role: "staff" | "admin"; notifications: number }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState("")

  async function signOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/admin/members?q=${encodeURIComponent(q)}` : "/admin/members")
  }

  const roleLabel = role === "admin" ? "Super Admin" : "Staff"

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-line bg-white px-5 py-3 lg:px-8">
      <form onSubmit={onSearch} className="relative hidden flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members, applications, companies..."
          className="w-full max-w-xl rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-heading outline-none placeholder:text-muted-2 focus:border-green focus:bg-white focus:ring-2 focus:ring-green/20"
        />
      </form>
      <div className="flex flex-1 items-center justify-end gap-3 md:flex-none">
        <Link
          href="/admin/applications"
          className="relative inline-flex size-10 items-center justify-center rounded-lg border border-line text-muted-2 hover:bg-surface hover:text-heading"
          aria-label={`${notifications} pending notifications`}
        >
          <Bell className="size-5" />
          {notifications > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-green px-1 text-[10px] font-bold text-white">
              {notifications > 99 ? "99+" : notifications}
            </span>
          )}
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-lg border border-line py-1.5 pl-1.5 pr-2.5 hover:bg-surface"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
              {initials(name)}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold text-heading">{name}</span>
              <span className="block text-xs text-muted-2">{roleLabel}</span>
            </span>
            <ChevronDown className="size-4 text-muted-2" />
          </button>
          {menuOpen && (
            <>
              <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg">
                <Link href="/" className="flex items-center gap-2.5 px-3 py-2 text-sm text-heading hover:bg-surface">
                  <Home className="size-4" /> View site
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-heading hover:bg-surface"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

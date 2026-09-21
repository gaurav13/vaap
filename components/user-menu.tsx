"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, LayoutDashboard, LogOut, Shield } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import type { HeaderUser } from "./site-header"

export function UserMenu({ user, overlay }: { user: NonNullable<HeaderUser>; overlay?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const isStaff = user.role === "staff" || user.role === "admin"

  async function signOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2.5 text-sm font-medium transition-colors",
          overlay ? "text-white hover:bg-white/10" : "text-navy hover:bg-mint",
        )}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-green text-xs font-bold text-white">
          {initials || "V"}
        </span>
        <span className="hidden max-w-24 truncate sm:inline">{user.name.split(" ")[0]}</span>
        <ChevronDown className="size-4 opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-heading">{user.name}</p>
            <p className="truncate text-xs text-muted-2">{user.email}</p>
            <span className="mt-2 inline-flex rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green">
              {user.role}
            </span>
          </div>
          <div className="flex flex-col p-1.5">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-body transition-colors hover:bg-mint hover:text-navy"
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
            {isStaff && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-body transition-colors hover:bg-mint hover:text-navy"
              >
                <Shield className="size-4" /> Admin Panel
              </Link>
            )}
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-body transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

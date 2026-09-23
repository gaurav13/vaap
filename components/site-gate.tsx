"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { ComingSoon } from "@/components/coming-soon"
import { isLaunchExempt } from "@/lib/launch-gate"

// The root layout does not re-render on client navigations, so a server-only
// check of `x-pathname` leaves the launch page mounted after the URL changes.
// This gate re-evaluates on every pathname change.
export function SiteGate({
  comingSoon,
  elevated,
  children,
}: {
  comingSoon: boolean
  elevated: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname() || "/"
  const router = useRouter()
  const locked = comingSoon && !elevated && !isLaunchExempt(pathname)

  useEffect(() => {
    if (locked && pathname !== "/") {
      router.replace("/")
    }
  }, [locked, pathname, router])

  if (!locked) return children
  return <ComingSoon />
}

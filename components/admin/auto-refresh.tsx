"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

/** Re-renders the server page on an interval while the tab is visible, so new registrations appear live. */
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter()
  const [updatedAt, setUpdatedAt] = useState(() => new Date())

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return
      router.refresh()
      setUpdatedAt(new Date())
    }
    const timer = window.setInterval(tick, intervalMs)
    document.addEventListener("visibilitychange", tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [router, intervalMs])

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-2" aria-live="polite">
      <RefreshCw className="size-3.5" aria-hidden />
      Live · updated {updatedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
    </p>
  )
}

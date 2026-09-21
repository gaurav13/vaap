"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { claimFirstAdmin } from "@/app/actions/bootstrap"

export function ClaimAdmin() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onClaim() {
    setError(null)
    startTransition(async () => {
      const res = await claimFirstAdmin()
      if (!res.ok) {
        setError(res.error ?? "Could not claim admin role.")
        return
      }
      router.push("/admin")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={onClaim} disabled={pending} className="shrink-0">
        {pending ? "Claiming…" : "Become Super Admin"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

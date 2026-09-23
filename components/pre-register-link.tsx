"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

export function PreRegisterLink({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter()

  return (
    <a
      href="/membership/apply"
      className={className}
      onClick={(event) => {
        event.preventDefault()
        router.push("/membership/apply")
        router.refresh()
      }}
    >
      {children}
    </a>
  )
}

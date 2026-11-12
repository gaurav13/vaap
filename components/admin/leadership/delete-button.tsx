"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { deleteLeadershipProfile } from "@/app/actions/leadership"
import { cn } from "@/lib/utils"

export function DeleteLeadershipButton({
  id,
  name,
  variant = "icon",
  redirectTo,
}: {
  id: number
  name: string
  variant?: "icon" | "button"
  redirectTo?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onDelete() {
    const label = name || "this profile"
    if (!window.confirm(`Delete ${label}? This removes the application, profile and its revision history. This cannot be undone.`)) return
    startTransition(async () => {
      const res = await deleteLeadershipProfile(id)
      if (!res.ok) {
        window.alert(res.error)
        return
      }
      if (redirectTo) router.push(redirectTo)
      router.refresh()
    })
  }

  const Icon = pending ? Loader2 : Trash2

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        <Icon className={cn("size-4", pending && "animate-spin")} aria-hidden="true" />
        {pending ? "Deleting…" : "Delete"}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      aria-label={`Delete ${name || "profile"}`}
      title="Delete"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-2 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <Icon className={cn("size-4", pending && "animate-spin")} aria-hidden="true" />
    </button>
  )
}

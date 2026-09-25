"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Trash2 } from "lucide-react"
import { deleteCoreRouteAction, restoreCoreRouteAction } from "@/app/actions/core-routes"

export function CoreRouteDeleteButton({ href, label }: { href: string; label: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Delete ${label} from sitemap`}
      onClick={() => {
        if (!window.confirm(`Remove "${label}" (${href}) from the sitemap? You can restore it later.`)) return
        startTransition(async () => {
          const res = await deleteCoreRouteAction(href)
          if (!res.ok) window.alert(res.error ?? "Could not delete page.")
          router.refresh()
        })
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line bg-background px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:border-destructive disabled:opacity-50"
    >
      <Trash2 className="size-3.5" /> {pending ? "Deleting…" : "Delete"}
    </button>
  )
}

export function CoreRouteRestoreButton({ href, label }: { href: string; label: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Restore ${label} to sitemap`}
      onClick={() =>
        startTransition(async () => {
          const res = await restoreCoreRouteAction(href)
          if (!res.ok) window.alert(res.error ?? "Could not restore page.")
          router.refresh()
        })
      }
      className="inline-flex items-center gap-1 rounded-md border border-line bg-background px-2.5 py-1 text-xs font-medium text-body transition-colors hover:border-green-border hover:text-green disabled:opacity-50"
    >
      <RotateCcw className="size-3.5" /> {pending ? "Restoring…" : "Restore"}
    </button>
  )
}

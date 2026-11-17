"use client"

import { useState, useTransition } from "react"
import { reviewSyncedChange, runWebsiteSync, type SyncActionResult } from "@/app/actions/ai-site-sync"
import { cn } from "@/lib/utils"

const btn = "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-50"
const primary = cn(btn, "bg-green text-primary-foreground hover:bg-green-hover")
const danger = cn(btn, "border border-destructive/30 text-destructive hover:bg-destructive/10")

function Result({ state }: { state: SyncActionResult | null }) {
  if (!state) return null
  return (
    <p role="status" className={cn("text-sm", state.ok ? "text-green" : "text-destructive")}>
      {state.ok ? state.message : state.error}
    </p>
  )
}

export function SyncNowButton() {
  const [pending, start] = useTransition()
  const [state, setState] = useState<SyncActionResult | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={pending} className={primary} onClick={() => start(async () => setState(await runWebsiteSync()))}>
        {pending ? "Syncing…" : "Sync website now"}
      </button>
      <Result state={state} />
    </div>
  )
}

export function SyncedChangeButtons({ id, title }: { id: number; title: string }) {
  const [pending, start] = useTransition()
  const [state, setState] = useState<SyncActionResult | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} className={primary} onClick={() => start(async () => setState(await reviewSyncedChange(id, "approve")))}>
        Approve change
        <span className="sr-only"> to {title}</span>
      </button>
      <button type="button" disabled={pending} className={danger} onClick={() => start(async () => setState(await reviewSyncedChange(id, "reject")))}>
        Keep current text
        <span className="sr-only"> for {title}</span>
      </button>
      <Result state={state} />
    </div>
  )
}

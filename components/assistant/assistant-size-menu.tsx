"use client"

import { Check, Maximize2, Minimize2, PanelRight, RectangleVertical, Scaling, type LucideIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type AssistantSize = "compact" | "standard" | "half" | "full"

export const ASSISTANT_SIZES: { id: AssistantSize; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "compact", label: "Compact", hint: "Small corner window", icon: Minimize2 },
  { id: "standard", label: "Standard", hint: "Default chat window", icon: RectangleVertical },
  { id: "half", label: "Half screen", hint: "Docked to the right", icon: PanelRight },
  { id: "full", label: "Full screen", hint: "Best for long answers", icon: Maximize2 },
]

export function isAssistantSize(value: unknown): value is AssistantSize {
  return ASSISTANT_SIZES.some((s) => s.id === value)
}

export function AssistantSizeMenu({
  size,
  onChange,
  onOpenChange,
}: {
  size: AssistantSize
  onChange: (size: AssistantSize) => void
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpenState] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  function setOpen(next: boolean) {
    setOpenState(next)
    onOpenChange?.(next)
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointer)
    const current = ASSISTANT_SIZES.findIndex((s) => s.id === size)
    requestAnimationFrame(() => itemRefs.current[Math.max(current, 0)]?.focus())
    return () => document.removeEventListener("pointerdown", onPointer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close(refocus: boolean) {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  function onMenuKey(e: React.KeyboardEvent) {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[]
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === "Escape") {
      e.preventDefault()
      close(true)
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const step = e.key === "ArrowDown" ? 1 : -1
      items[(index + step + items.length) % items.length]?.focus()
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault()
      items[e.key === "Home" ? 0 : items.length - 1]?.focus()
    } else if (e.key === "Tab") {
      close(false)
    }
  }

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change window size"
        title="Change window size"
        className={cn(
          "flex size-9 items-center justify-center rounded-full transition-colors hover:bg-primary-foreground/15",
          open && "bg-primary-foreground/15",
        )}
      >
        <Scaling className="size-4.5" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Window size"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col gap-0.5 rounded-2xl border border-line bg-card p-1.5 text-heading shadow-xl shadow-heading/15 animate-in fade-in zoom-in-95 duration-150"
        >
          {ASSISTANT_SIZES.map((s, i) => {
            const active = s.id === size
            return (
              <button
                key={s.id}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onChange(s.id)
                  close(true)
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2.5 py-2 text-start outline-none transition-colors hover:bg-surface focus-visible:bg-surface",
                  active && "bg-mint hover:bg-mint focus-visible:bg-mint",
                )}
              >
                <s.icon className={cn("size-4.5 shrink-0", active ? "text-green" : "text-muted-2")} aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold leading-tight">{s.label}</span>
                  <span className="text-xs leading-snug text-muted-2">{s.hint}</span>
                </span>
                {active && <Check className="size-4 shrink-0 text-green" aria-hidden />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

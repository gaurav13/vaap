"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type Ctx = { open: boolean; onOpenChange: (open: boolean) => void; titleId: string; descId: string }
const DialogContext = React.createContext<Ctx | null>(null)

function useDialog() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("Dialog components must be used inside <Dialog>")
  return ctx
}

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  const titleId = React.useId()
  const descId = React.useId()
  return <DialogContext.Provider value={{ open, onOpenChange, titleId, descId }}>{children}</DialogContext.Provider>
}

// Native <dialog> gives focus trapping, Escape handling and top-layer rendering for free.
export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, onOpenChange, titleId, descId } = useDialog()
  const ref = React.useRef<HTMLDialogElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-transparent p-0 text-body shadow-xl backdrop:bg-navy/50 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className={cn("relative w-full bg-card p-6", className)}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-2 transition-colors hover:bg-surface hover:text-heading"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 pr-8", className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = useDialog()
  return <h2 id={titleId} className={cn("font-serif text-lg font-bold text-heading", className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { descId } = useDialog()
  return <p id={descId} className={cn("text-sm leading-relaxed text-muted-2", className)} {...props} />
}

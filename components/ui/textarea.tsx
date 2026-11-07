import type * as React from "react"
import { cn } from "@/lib/utils"

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full resize-y rounded-lg border border-line bg-card px-3 py-2.5 text-sm leading-relaxed text-heading outline-none transition-colors placeholder:text-muted-2 focus:border-green focus:ring-2 focus:ring-green/20 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  )
}

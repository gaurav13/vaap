import type * as React from "react"
import { cn } from "@/lib/utils"

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm text-heading outline-none transition-colors placeholder:text-muted-2 focus:border-green focus:ring-2 focus:ring-green/20 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  )
}

import type * as React from "react"
import { cn } from "@/lib/utils"

type CheckboxProps = Omit<React.ComponentProps<"input">, "type" | "onChange" | "checked"> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export function Checkbox({ className, checked, onCheckedChange, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn("size-4 shrink-0 cursor-pointer rounded accent-green disabled:cursor-not-allowed disabled:opacity-60", className)}
      {...props}
    />
  )
}

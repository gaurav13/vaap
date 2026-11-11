import Image from "next/image"
import { cn } from "@/lib/utils"

export function AssistantIcon({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/images/vaap-ai-mascot.png"
      alt=""
      aria-hidden
      width={128}
      height={128}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
    />
  )
}

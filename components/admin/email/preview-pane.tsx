"use client"

import { useState } from "react"
import { Monitor, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

export function PreviewPane({ html, subject, previewText, loading, error }: { html: string | null; subject: string; previewText: string; loading: boolean; error: string }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-heading">{subject || "(no subject)"}</p>
          <p className="truncate text-xs text-muted-2">{previewText || "No preview description"}</p>
        </div>
        <div className="inline-flex rounded-lg border border-line" role="group" aria-label="Preview size">
          {(
            [
              ["desktop", Monitor, "Desktop"],
              ["mobile", Smartphone, "Mobile"],
            ] as const
          ).map(([d, Icon, label]) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              className={cn("flex h-9 items-center gap-2 px-3 text-xs font-semibold", device === d ? "bg-mint text-green" : "text-body hover:bg-surface")}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-center rounded-xl border border-line bg-surface p-3 sm:p-6">
        {error ? (
          <p className="py-16 text-sm text-destructive" role="alert">{error}</p>
        ) : loading || !html ? (
          <p className="py-16 text-sm text-muted-2" role="status">Rendering preview…</p>
        ) : (
          <iframe
            title="Email preview"
            srcDoc={html}
            sandbox=""
            className={cn("h-[640px] rounded-lg border border-line bg-card transition-all", device === "mobile" ? "w-[375px] max-w-full" : "w-full max-w-[680px]")}
          />
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted-2">
        This is the exact email recipients receive. {"{{name}}"} is shown with your name.
      </p>
    </div>
  )
}

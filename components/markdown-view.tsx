"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { renderSafeMarkdown } from "@/lib/markdown-safe"

const BASE =
  "text-pretty break-words leading-relaxed " +
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 " +
  "[&_p]:mb-2.5 " +
  "[&_h2]:mb-1.5 [&_h2]:mt-4 [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:text-heading " +
  "[&_h3]:mb-1.5 [&_h3]:mt-3.5 [&_h3]:font-semibold [&_h3]:leading-snug [&_h3]:text-heading " +
  "[&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:font-semibold [&_h4]:text-heading " +
  "[&_strong]:font-semibold [&_strong]:text-heading [&_em]:italic " +
  "[&_a]:font-semibold [&_a]:text-green [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-green-hover " +
  "[&_ul]:mb-2.5 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:mb-2.5 [&_ol]:list-decimal [&_ol]:ps-5 " +
  "[&_li]:mb-1 [&_li]:ps-0.5 [&_li>p]:mb-1 [&_li_ul]:mb-0 [&_li_ul]:mt-1 [&_li_ol]:mb-0 [&_li_ol]:mt-1 " +
  "[&_blockquote]:my-3 [&_blockquote]:border-s-2 [&_blockquote]:border-green [&_blockquote]:ps-3 [&_blockquote]:italic " +
  "[&_hr]:my-4 [&_hr]:border-line " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] " +
  "[&_pre]:mb-2.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_table]:mb-2.5 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto " +
  "[&_th]:border-b [&_th]:border-line [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-start [&_th]:font-semibold " +
  "[&_td]:border-b [&_td]:border-line [&_td]:px-2 [&_td]:py-1.5"

const SIZES = {
  sm: "text-sm [&_h2]:text-base [&_h3]:text-sm [&_h4]:text-sm",
  base: "text-base [&_h2]:text-xl [&_h3]:text-lg",
}

/** Renders Markdown (or plain text) as formatted, sanitized content. */
export function MarkdownView({
  text,
  className,
  size = "sm",
}: {
  text: string | null | undefined
  className?: string
  size?: keyof typeof SIZES
}) {
  const router = useRouter()
  const html = useMemo(() => renderSafeMarkdown(text), [text])
  if (!html) return null

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    const link = (e.target as HTMLElement).closest("a")
    const href = link?.getAttribute("href")
    if (!href || !href.startsWith("/") || href.startsWith("//") || e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    router.push(href)
  }

  return <div className={cn(BASE, SIZES[size], className)} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
}

import { cn } from "@/lib/utils"
import { renderRichContent } from "@/lib/rich-content"

const BASE =
  "text-pretty leading-relaxed text-body break-words " +
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 " +
  "[&_p]:mb-4 [&_p]:leading-relaxed " +
  "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:text-heading " +
  "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-snug [&_h3]:text-heading " +
  "[&_h4]:mb-2 [&_h4]:mt-5 [&_h4]:font-semibold [&_h4]:text-heading " +
  "[&_strong]:font-semibold [&_strong]:text-heading [&_em]:italic " +
  "[&_mark]:rounded-sm [&_mark]:bg-mint [&_mark]:px-1 [&_mark]:text-heading " +
  "[&_a]:font-medium [&_a]:text-green [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-green-hover " +
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 " +
  "[&_li]:mb-1.5 [&_li]:pl-1 [&_li>p]:mb-1 [&_li_ul]:mb-0 [&_li_ul]:mt-1.5 [&_li_ol]:mb-0 [&_li_ol]:mt-1.5 " +
  "[&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-green [&_blockquote]:pl-4 [&_blockquote]:italic " +
  "[&_hr]:my-8 [&_hr]:border-line " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm " +
  "[&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_img]:my-6 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-xl " +
  "[&_table]:mb-4 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:text-sm " +
  "[&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-heading " +
  "[&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2"

const SIZES = {
  sm: "text-sm [&_h2]:text-lg [&_h3]:text-base [&_p]:mb-3",
  base: "text-base",
}

/** Displays stored content (Markdown, plain text or HTML) as clean, sanitized rich text. */
export function RichContent({
  value,
  className,
  size = "base",
}: {
  value: string | null | undefined
  className?: string
  size?: keyof typeof SIZES
}) {
  const html = renderRichContent(value)
  if (!html) return null
  return <div className={cn(BASE, SIZES[size], className)} dangerouslySetInnerHTML={{ __html: html }} />
}

const MARKDOWN_HINT = /(\*\*[^*\n]+\*\*|__[^_\n]+__|^\s{0,3}#{1,6}\s+\S|^\s*[-*+•]\s+\S|^\s*\d+[.)]\s+\S|\[[^\]]+\]\([^)]+\)|^\s*>\s+\S|^\s*-{3,}\s*$)/m

export function looksLikeMarkdown(text: string) {
  return MARKDOWN_HINT.test(text)
}

/** Plain-text version of rich content for cards, excerpts and line-clamped previews. */
export function richTextToPlain(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+•]\s+/gm, "")
    .replace(/(\*\*|__|==|\*|`)/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

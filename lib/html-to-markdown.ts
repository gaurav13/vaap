import TurndownService from "turndown"

let service: TurndownService | null = null

function getService() {
  if (service) return service
  service = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
    hr: "---",
  })
  service.remove(["script", "style", "img"])
  return service
}

/** Editor HTML to clean Markdown for storage. Browser-only (needs the DOM). */
export function htmlToMarkdown(html: string) {
  const stripped = html.replace(/<br\s*\/?>/gi, "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
  if (!stripped) return ""
  return getService()
    .turndown(html)
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

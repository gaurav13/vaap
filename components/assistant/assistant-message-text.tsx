import Link from "next/link"
import { Fragment, type ReactNode } from "react"

const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g

function safeHref(href: string) {
  if (href.startsWith("/") && !href.startsWith("//")) return href
  try {
    const url = new URL(href)
    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  let i = 0
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const key = `${keyPrefix}-${i++}`
    if (match[1]) {
      const href = safeHref(match[2])
      if (!href) nodes.push(match[1])
      else if (href.startsWith("/"))
        nodes.push(
          <Link key={key} href={href} className="font-semibold text-green underline underline-offset-2 hover:text-green-hover">
            {match[1]}
          </Link>,
        )
      else
        nodes.push(
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-green underline underline-offset-2 hover:text-green-hover">
            {match[1]}
          </a>,
        )
    } else {
      nodes.push(
        <strong key={key} className="font-semibold text-heading">
          {match[3]}
        </strong>,
      )
    }
    last = match.index + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function AssistantMessageText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, b) => {
        const lines = block.split("\n")
        const isList = lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))
        if (isList) {
          return (
            <ul key={b} className="flex list-disc flex-col gap-1 ps-5">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""), `${b}-${j}`)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={b}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(l.replace(/^#+\s*/, ""), `${b}-${j}`)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

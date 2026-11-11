import { MarkdownView } from "@/components/markdown-view"

export function AssistantMessageText({ text }: { text: string }) {
  return <MarkdownView text={text} />
}

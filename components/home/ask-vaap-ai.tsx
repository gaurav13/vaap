"use client"

import { SendHorizontal } from "lucide-react"
import { useState } from "react"
import { openAssistant } from "@/components/assistant/assistant-events"
import { AssistantIcon } from "@/components/assistant/assistant-icon"

const SUGGESTIONS = ["How do I become a member?", "Upcoming events", "What is blockchain?"]

export function AskVaapAi() {
  const [question, setQuestion] = useState("")

  function submit(text: string) {
    openAssistant(text)
    setQuestion("")
  }

  return (
    <section aria-labelledby="ask-vaap-ai-title" className="bg-background px-4 pt-8 sm:px-8 sm:pt-10 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl border border-line bg-mint p-4 sm:gap-5 sm:rounded-3xl sm:p-6 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex items-center gap-3 sm:items-start sm:gap-4 lg:max-w-md">
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm sm:size-12">
            <AssistantIcon className="size-full" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5 sm:gap-1">
            <h2 id="ask-vaap-ai-title" className="text-lg font-bold leading-tight text-heading text-balance sm:text-xl">
              Ask VAAP AI
            </h2>
            <p className="text-xs leading-relaxed text-body sm:hidden">English, اردو or Roman Urdu</p>
            <p className="hidden text-sm leading-relaxed text-body text-pretty sm:block">
              Get instant answers about membership, events, voting, blockchain and support, in English, اردو or Roman
              Urdu.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(question)
            }}
            className="flex items-center gap-2 rounded-full border border-line-light bg-card py-1 pl-4 pr-1 shadow-sm focus-within:border-green-border sm:py-1.5 sm:pl-5 sm:pr-1.5"
          >
            <label htmlFor="ask-vaap-ai-input" className="sr-only">
              Ask VAAP AI a question
            </label>
            <input
              id="ask-vaap-ai-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={2000}
              placeholder="Ask a question..."
              enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent py-2 text-base text-heading outline-none placeholder:text-body/60 sm:text-sm"
            />
            <button
              type="submit"
              aria-label="Send question to VAAP AI"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-hover text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
            >
              <SendHorizontal className="size-4" aria-hidden="true" />
            </button>
          </form>
          <div className="flex snap-x gap-2 overflow-x-auto [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="shrink-0 snap-start whitespace-nowrap rounded-full border border-line-light bg-card px-3 py-1.5 text-xs font-semibold text-heading transition-colors hover:border-green-border"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

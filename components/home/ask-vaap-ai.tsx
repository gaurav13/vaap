"use client"

import { Bot, SendHorizontal } from "lucide-react"
import { useState } from "react"
import { openAssistant } from "@/components/assistant/assistant-events"

const SUGGESTIONS = ["How do I become a member?", "Upcoming events", "What is blockchain?"]

export function AskVaapAi() {
  const [question, setQuestion] = useState("")

  function submit(text: string) {
    openAssistant(text)
    setQuestion("")
  }

  return (
    <section aria-labelledby="ask-vaap-ai-title" className="bg-background px-5 pt-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl border border-line bg-mint p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex items-start gap-4 lg:max-w-md">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-green-hover text-primary-foreground ring-2 ring-gold/70">
            <Bot className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="ask-vaap-ai-title" className="text-xl font-bold text-heading text-balance">
              Ask VAAP AI
            </h2>
            <p className="text-sm leading-relaxed text-body text-pretty">
              Get instant answers about membership, events, voting, blockchain and support, in English, اردو or Roman
              Urdu.
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(question)
            }}
            className="flex items-center gap-2 rounded-full border border-line-light bg-card py-1.5 pl-5 pr-1.5 shadow-sm focus-within:border-green-border"
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
              className="min-w-0 flex-1 bg-transparent text-sm text-heading outline-none placeholder:text-body/60"
            />
            <button
              type="submit"
              aria-label="Send question to VAAP AI"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-hover text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
            >
              <SendHorizontal className="size-4" aria-hidden="true" />
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full border border-line-light bg-card px-3 py-1.5 text-xs font-semibold text-heading transition-colors hover:border-green-border"
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

"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import {
  Bot,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Landmark,
  Layers,
  Minus,
  RotateCcw,
  Scale,
  SendHorizontal,
  TriangleAlert,
  Users,
  Vote,
  X,
  type LucideIcon,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { AssistantMessageText } from "./assistant-message-text"

type Lang = "en" | "ur" | "roman-ur"

const COPY: Record<Lang, { hello: string; intro: string; ask: string; placeholder: string; thinking: string; privacy: string; newChat: string }> = {
  en: {
    hello: "Hello!",
    intro:
      "I'm your VAAP AI Assistant. I can help you explore VAAP, learn about membership, understand blockchain and virtual assets, find events, explain voting, explore business opportunities, and get support.",
    ask: "How can I help you today?",
    placeholder: "Ask a question...",
    thinking: "Thinking...",
    privacy: "AI answers can be wrong. Never share passwords or private keys.",
    newChat: "New conversation",
  },
  ur: {
    hello: "السلام علیکم!",
    intro:
      "میں آپ کا VAAP AI اسسٹنٹ ہوں۔ میں VAAP، ممبرشپ، بلاک چین اور ورچوئل اثاثوں، ایونٹس، ووٹنگ، کاروباری مواقع اور سپورٹ کے بارے میں آپ کی مدد کر سکتا ہوں۔",
    ask: "آج میں آپ کی کیا مدد کر سکتا ہوں؟",
    placeholder: "اپنا سوال لکھیں...",
    thinking: "سوچ رہا ہوں...",
    privacy: "AI کے جوابات غلط بھی ہو سکتے ہیں۔ پاس ورڈ یا پرائیویٹ کیز کبھی شیئر نہ کریں۔",
    newChat: "نئی گفتگو",
  },
  "roman-ur": {
    hello: "Assalam o Alaikum!",
    intro:
      "Main aap ka VAAP AI Assistant hoon. Main VAAP, membership, blockchain aur virtual assets, events, voting, business opportunities aur support ke baare mein aap ki madad kar sakta hoon.",
    ask: "Aaj main aap ki kya madad kar sakta hoon?",
    placeholder: "Apna sawal likhein...",
    thinking: "Soch raha hoon...",
    privacy: "AI ke jawab ghalat bhi ho sakte hain. Password ya private keys kabhi share na karein.",
    newChat: "Nayi guftagu",
  },
}

type QuickAction = { icon: LucideIcon; tone: "green" | "gold"; label: Record<Lang, string>; prompt: Record<Lang, string> }

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: Landmark,
    tone: "green",
    label: { en: "Explore VAAP", ur: "VAAP کا تعارف", "roman-ur": "Explore VAAP" },
    prompt: { en: "What is VAAP and what does it do?", ur: "VAAP کیا ہے اور یہ کیا کرتا ہے؟", "roman-ur": "VAAP kya hai aur yeh kya karta hai?" },
  },
  {
    icon: Users,
    tone: "green",
    label: { en: "Membership & Benefits", ur: "ممبرشپ اور فوائد", "roman-ur": "Membership & Benefits" },
    prompt: {
      en: "What are the VAAP membership categories and benefits? What is my membership status?",
      ur: "VAAP ممبرشپ کی اقسام اور فوائد کیا ہیں؟ میری ممبرشپ کی صورتحال کیا ہے؟",
      "roman-ur": "VAAP membership ki categories aur benefits kya hain? Meri membership ka status kya hai?",
    },
  },
  {
    icon: Layers,
    tone: "green",
    label: { en: "Blockchain Knowledge", ur: "بلاک چین معلومات", "roman-ur": "Blockchain Knowledge" },
    prompt: { en: "Explain blockchain in simple terms.", ur: "بلاک چین کو آسان الفاظ میں سمجھائیں۔", "roman-ur": "Blockchain ko aasaan alfaaz mein samjhayein." },
  },
  {
    icon: CalendarDays,
    tone: "green",
    label: { en: "Events & Programs", ur: "ایونٹس اور پروگرام", "roman-ur": "Events & Programs" },
    prompt: { en: "What VAAP events are coming up?", ur: "VAAP کے آنے والے ایونٹس کون سے ہیں؟", "roman-ur": "VAAP ke upcoming events kaun se hain?" },
  },
  {
    icon: Vote,
    tone: "gold",
    label: { en: "Voting & Governance", ur: "ووٹنگ اور گورننس", "roman-ur": "Voting & Governance" },
    prompt: { en: "How does voting and governance work at VAAP?", ur: "VAAP میں ووٹنگ اور گورننس کیسے کام کرتی ہے؟", "roman-ur": "VAAP mein voting aur governance kaise kaam karti hai?" },
  },
  {
    icon: TriangleAlert,
    tone: "gold",
    label: { en: "Report a Concern", ur: "شکایت درج کریں", "roman-ur": "Report a Concern" },
    prompt: { en: "How can I report a concern or check my complaint status?", ur: "میں شکایت کیسے درج کروں یا اس کی صورتحال کیسے دیکھوں؟", "roman-ur": "Main concern kaise report karun ya complaint ka status kaise dekhun?" },
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    tone: "green",
    label: { en: "Business Opportunities", ur: "کاروباری مواقع", "roman-ur": "Business Opportunities" },
    prompt: {
      en: "What business opportunities and startup support does VAAP offer?",
      ur: "VAAP کون سے کاروباری مواقع اور اسٹارٹ اپ سپورٹ فراہم کرتا ہے؟",
      "roman-ur": "VAAP kaun si business opportunities aur startup support deta hai?",
    },
  },
  {
    icon: Scale,
    tone: "gold",
    label: { en: "Regulatory Insights", ur: "ریگولیٹری معلومات", "roman-ur": "Regulatory Insights" },
    prompt: {
      en: "What is the current regulatory landscape for virtual assets in Pakistan?",
      ur: "پاکستان میں ورچوئل اثاثوں کے موجودہ ضوابط کیا ہیں؟",
      "roman-ur": "Pakistan mein virtual assets ke current regulations kya hain?",
    },
  },
]

const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "ur", label: "اردو" },
  { id: "roman-ur", label: "Roman Urdu" },
]

function textOf(message: UIMessage) {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("")
}

export function AssistantWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(false)
  const [lang, setLang] = useState<Lang>("en")
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const langRef = useRef(lang)
  langRef.current = lang
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/assistant", body: () => ({ language: langRef.current }) }),
    [],
  )
  const { messages, sendMessage, status, error, setMessages, stop, clearError } = useChat({ transport })

  const busy = status === "submitted" || status === "streaming"
  const copy = COPY[lang]
  const rtl = lang === "ur"

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, status])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (pathname?.startsWith("/admin")) return null

  function ask(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    clearError()
    sendMessage({ text: trimmed })
    setInput("")
  }

  function reset() {
    stop()
    clearError()
    setMessages([])
    setInput("")
    inputRef.current?.focus()
  }

  function toggle() {
    setOpen((v) => !v)
    setSeen(true)
  }

  const lastAssistantEmpty = messages.at(-1)?.role === "user" || (messages.at(-1) && !textOf(messages.at(-1)!).trim())

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-4 sm:bottom-6 sm:right-6">
      {open && (
        <section
          id="vaap-assistant"
          role="dialog"
          aria-label="VAAP AI Assistant"
          className="flex h-[min(680px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-2xl shadow-heading/15 animate-in fade-in slide-in-from-bottom-4 duration-200 sm:w-[400px]"
        >
          <header className="flex items-center gap-3 bg-green-hover px-4 py-3.5 text-primary-foreground">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-green-hover ring-2 ring-gold/70">
              <Bot className="size-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold leading-tight">VAAP AI Assistant</h2>
              <p className="truncate text-xs text-primary-foreground/75">Your Guide to Virtual Assets, Knowledge & Community Support</p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-primary-foreground/15"
                aria-label={copy.newChat}
                title={copy.newChat}
              >
                <RotateCcw className="size-4.5" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-primary-foreground/15"
              aria-label="Minimize assistant"
            >
              <Minus className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                reset()
                setOpen(false)
              }}
              className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-primary-foreground/15"
              aria-label="Close assistant"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-4" dir={rtl ? "rtl" : "ltr"}>
                <div className="flex gap-3 rounded-2xl bg-mint p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-green-hover shadow-sm">
                    <Bot className="size-5" aria-hidden />
                  </span>
                  <div className="flex flex-col gap-2">
                    <p className="text-xl font-bold text-heading">{copy.hello}</p>
                    <p className="text-sm leading-relaxed text-body">{copy.intro}</p>
                    <p className="text-sm font-semibold text-heading">{copy.ask}</p>
                  </div>
                </div>
                <ul className="grid grid-cols-2 gap-3">
                  {QUICK_ACTIONS.map((a) => (
                    <li key={a.label.en}>
                      <button
                        type="button"
                        onClick={() => ask(a.prompt[lang])}
                        className="flex h-full w-full items-center gap-3 rounded-2xl border border-line-light bg-card px-3 py-3 text-start text-sm font-semibold leading-snug text-heading shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-border hover:shadow-md focus-visible:outline-2 focus-visible:outline-green"
                      >
                        <a.icon className={cn("size-6 shrink-0", a.tone === "gold" ? "text-gold" : "text-green")} aria-hidden />
                        <span className="text-pretty">{a.label[lang]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ol className="flex flex-col gap-3">
                {messages.map((m) => {
                  const text = textOf(m)
                  if (!text.trim()) return null
                  return (
                    <li key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                      {m.role === "assistant" && (
                        <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-mint text-green-hover">
                          <Bot className="size-4" aria-hidden />
                        </span>
                      )}
                      <div
                        dir="auto"
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          m.role === "user" ? "rounded-br-md bg-green text-primary-foreground" : "rounded-bl-md bg-surface text-body",
                        )}
                      >
                        {m.role === "user" ? <p className="whitespace-pre-wrap">{text}</p> : <AssistantMessageText text={text} />}
                      </div>
                    </li>
                  )
                })}
                {busy && lastAssistantEmpty && (
                  <li className="flex items-center gap-2 text-sm text-muted-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-mint text-green-hover">
                      <Bot className="size-4 animate-pulse" aria-hidden />
                    </span>
                    {copy.thinking}
                  </li>
                )}
                {error && (
                  <li role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                    {error.message && error.message.length < 300 ? error.message : "Something went wrong. Please try again."}
                  </li>
                )}
              </ol>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-line-light px-4 pb-3 pt-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                ask(input)
              }}
              className="flex items-center gap-2 rounded-full border border-line bg-card py-1.5 pe-1.5 ps-4 shadow-sm focus-within:border-green"
            >
              <label htmlFor="vaap-assistant-input" className="sr-only">
                {copy.placeholder}
              </label>
              <input
                id="vaap-assistant-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
                }}
                placeholder={copy.placeholder}
                maxLength={2000}
                dir="auto"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-sm text-heading outline-none placeholder:text-muted-2"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-hover text-primary-foreground transition-colors hover:bg-green disabled:opacity-50"
                aria-label="Send question"
              >
                <SendHorizontal className="size-4.5" aria-hidden />
              </button>
            </form>
            <div className="flex items-center justify-center" role="radiogroup" aria-label="Assistant language">
              <div className="flex items-center rounded-full border border-line-light bg-surface p-1">
                {LANGS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={lang === l.id}
                    onClick={() => setLang(l.id)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                      lang === l.id ? "bg-green-hover text-primary-foreground" : "text-heading hover:text-green",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-center text-xs text-muted-2" dir={rtl ? "rtl" : "ltr"}>
              {copy.privacy}
            </p>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="vaap-assistant"
        aria-label={open ? "Hide VAAP AI Assistant" : "Open VAAP AI Assistant"}
        className="relative flex size-16 items-center justify-center rounded-full bg-green-hover text-primary-foreground shadow-xl shadow-green/30 ring-4 ring-card transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
      >
        {open ? <X className="size-7" aria-hidden /> : <Bot className="size-8" aria-hidden />}
        {!seen && <span className="absolute right-0.5 top-0.5 size-4 rounded-full bg-destructive ring-2 ring-card" aria-hidden />}
      </button>
    </div>
  )
}

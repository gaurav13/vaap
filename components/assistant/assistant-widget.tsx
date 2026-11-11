"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  Copy,
  History,
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
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import type { PublicAssistantConfig, UsageState } from "@/lib/ai-assistant/config"
import type { ConversationSummary, StoredMessage } from "@/lib/ai-assistant/history"
import { useSession } from "@/lib/auth-client"
import { AllowanceLine, LimitCard, LimitStatus, limitedPlaceholder } from "./assistant-usage"
import { AssistantAuthGate } from "./assistant-auth-gate"
import { AssistantHistory } from "./assistant-history"
import { cn } from "@/lib/utils"
import { AssistantFeedback } from "./assistant-feedback"
import { AssistantMessageText } from "./assistant-message-text"
import { ASSISTANT_ASK_EVENT } from "./assistant-events"
import { AssistantIcon } from "./assistant-icon"

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

type QuickAction = {
  key?: PublicAssistantConfig["quickActions"][number]
  icon: LucideIcon
  tone: "green" | "gold"
  label: Record<Lang, string>
  prompt: Record<Lang, string>
}

const ACTION_KEYS: Record<string, QuickAction["key"]> = {
  "Membership & Benefits": "membership",
  "Blockchain Knowledge": "blockchain",
  "Events & Programs": "events",
  "Voting & Governance": "voting",
  "Business Opportunities": "business",
  "Regulatory Insights": "regulatory",
}

const fetchConfig = (url: string) => fetch(url).then((r) => r.json() as Promise<PublicAssistantConfig>)

const fetchUsage = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<UsageState>) : undefined))

const fetchConversations = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) =>
    r.ok ? (r.json() as Promise<{ conversations: ConversationSummary[] }>).then((d) => d.conversations) : [],
  )

const LIMIT_DISMISSED_KEY = "vaap-ai-limit-dismissed"

type MessageMeta = {
  requestId?: string
  free?: boolean
  limited?: boolean
  usage?: UsageState
  stored?: StoredMessage["status"]
}

function toUIMessage(m: StoredMessage): UIMessage {
  return {
    id: m.id,
    role: m.role,
    parts: m.content ? [{ type: "text", text: m.content }] : [],
    metadata: { requestId: m.requestId ?? undefined, stored: m.status } satisfies MessageMeta,
  }
}

function CopyAnswer({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
          .catch(() => {})
      }
      className="flex h-7 items-center gap-1 rounded-full px-2 text-xs text-muted-2 transition-colors hover:bg-surface hover:text-heading"
      aria-label={copied ? "Answer copied" : "Copy answer"}
    >
      {copied ? <Check className="size-3.5 text-green" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

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

  const { data: session, isPending: sessionPending, refetch: refetchSession } = useSession()
  const user = session?.user as { id: string; email: string; emailVerified?: boolean } | undefined
  const access = sessionPending && !session ? "loading" : !user ? "signed-out" : !user.emailVerified ? "unverified" : "ok"
  const canChat = access === "ok"
  const returnPath = `${pathname || "/"}?assistant=open`
  const [view, setView] = useState<"chat" | "history">("chat")
  const [activeId, setActiveId] = useState("")

  const { data: config } = useSWR(open ? "/api/assistant/config" : null, fetchConfig, { revalidateOnFocus: false })
  const languages = LANGS.filter((l) => !config || config.languages.includes(l.id))
  const quickActions = QUICK_ACTIONS.filter((a) => {
    const key = ACTION_KEYS[a.label.en]
    return !key || !config || config.quickActions.includes(key)
  })

  const langRef = useRef(lang)
  langRef.current = lang
  const conversationRef = useRef("")
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant",
        body: () => {
          if (!conversationRef.current) conversationRef.current = crypto.randomUUID()
          return { language: langRef.current, conversationId: conversationRef.current }
        },
      }),
    [],
  )
  const { data: usage, mutate: mutateUsage } = useSWR(open && canChat ? "/api/assistant/usage" : null, fetchUsage, {
    revalidateOnFocus: false,
  })
  const { data: conversations, mutate: mutateConversations } = useSWR(
    open && canChat ? "/api/assistant/conversations" : null,
    fetchConversations,
    { revalidateOnFocus: false },
  )
  const { messages, sendMessage, status, error, setMessages, stop, clearError } = useChat({
    transport,
    onFinish: ({ message }) => {
      const next = (message.metadata as MessageMeta | undefined)?.usage
      if (next) mutateUsage(next, { revalidate: false })
      else mutateUsage()
      mutateConversations()
    },
    // Failed requests are refunded server-side, so re-read the real count.
    onError: () => {
      mutateUsage()
      mutateConversations()
    },
  })

  async function openConversation(id: string) {
    const res = await fetch(`/api/assistant/conversations/${id}`, { cache: "no-store" }).catch(() => null)
    if (!res?.ok) {
      mutateConversations()
      return
    }
    const data = (await res.json()) as { language?: string; messages: StoredMessage[] }
    stop()
    clearError()
    conversationRef.current = id
    setActiveId(id)
    setMessages(data.messages.map(toUIMessage))
    if (data.language && data.language in COPY) setLang(data.language as Lang)
    setView("chat")
  }

  // Reopen the member's most recent conversation once per sign-in, so a refresh or another device picks up where they left off.
  const restoredFor = useRef<string | null>(null)
  const restoreLatest = useEffectEvent((list: ConversationSummary[]) => {
    if (!user || restoredFor.current === user.id) return
    restoredFor.current = user.id
    if (messages.length === 0 && list[0]) openConversation(list[0].id)
  })
  useEffect(() => {
    if (conversations) restoreLatest(conversations)
  }, [conversations])

  // Never show one account's conversation to the next person who signs in on the same browser.
  const lastUserId = useRef<string | undefined>(undefined)
  const clearForUser = useEffectEvent(() => {
    stop()
    setMessages([])
    conversationRef.current = ""
    restoredFor.current = null
    setActiveId("")
    setView("chat")
  })
  useEffect(() => {
    if (sessionPending) return
    const id = user?.id ?? ""
    if (lastUserId.current !== undefined && lastUserId.current !== id) clearForUser()
    lastUserId.current = id
  }, [user?.id, sessionPending])

  // Sign-in and email verification links come back with ?assistant=open so the chat reopens where the member left.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get("assistant") !== "open") return
    url.searchParams.delete("assistant")
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash)
    setOpen(true)
    setSeen(true)
  }, [pathname])

  // Remembers which reset window the full notice was dismissed for, so it stays closed for this browser session.
  const [limitDismissed, setLimitDismissed] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.sessionStorage.getItem(LIMIT_DISMISSED_KEY),
  )
  function dismissLimit(resetAt: string) {
    setLimitDismissed(resetAt)
    try {
      window.sessionStorage.setItem(LIMIT_DISMISSED_KEY, resetAt)
    } catch {}
  }

  const busy = status === "submitted" || status === "streaming"
  const limited = usage?.remaining === 0
  const welcome = config?.welcome?.[lang]?.trim()
  const copy = { ...COPY[lang], ...(welcome ? { intro: welcome } : {}) }
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

  const askFromEvent = useEffectEvent((text: string) => ask(text))
  useEffect(() => {
    const onAsk = (e: Event) => {
      const text = (e as CustomEvent<{ text?: string }>).detail?.text ?? ""
      setOpen(true)
      setSeen(true)
      if (text.trim()) askFromEvent(text)
      else requestAnimationFrame(() => inputRef.current?.focus())
    }
    window.addEventListener(ASSISTANT_ASK_EVENT, onAsk)
    return () => window.removeEventListener(ASSISTANT_ASK_EVENT, onAsk)
  }, [])

  if (pathname?.startsWith("/admin")) return null

  function ask(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy || limited || !canChat) return
    clearError()
    if (!conversationRef.current) {
      conversationRef.current = crypto.randomUUID()
      setActiveId(conversationRef.current)
    }
    setView("chat")
    sendMessage({ text: trimmed })
    setInput("")
  }

  // Resends the same question id, so the server reuses the saved question instead of storing it twice.
  function retryLast() {
    const lastUser = messages.findLast((m) => m.role === "user")
    if (!lastUser || busy || limited || !canChat) return
    clearError()
    sendMessage({ text: textOf(lastUser), messageId: lastUser.id })
  }

  function reset() {
    stop()
    clearError()
    setMessages([])
    conversationRef.current = ""
    setActiveId("")
    setView("chat")
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
            <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-2 ring-gold/70">
              <AssistantIcon className="size-full" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold leading-tight">VAAP AI Assistant</h2>
              <p className="truncate text-xs text-primary-foreground/75">Your Guide to Virtual Assets, Knowledge & Community Support</p>
            </div>
            {canChat && (
              <button
                type="button"
                onClick={() => setView((v) => (v === "history" ? "chat" : "history"))}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full transition-colors hover:bg-primary-foreground/15",
                  view === "history" && "bg-primary-foreground/15",
                )}
                aria-pressed={view === "history"}
                aria-label="Conversation history"
                title="Conversation history"
              >
                <History className="size-4.5" aria-hidden />
              </button>
            )}
            {canChat && messages.length > 0 && view === "chat" && (
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
              onClick={() => setOpen(false)}
              className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-primary-foreground/15"
              aria-label="Close assistant"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
            {access === "loading" ? (
              <p className="py-10 text-center text-sm text-muted-2">Loading...</p>
            ) : access === "signed-out" ? (
              <AssistantAuthGate kind="signed-out" returnPath={returnPath} />
            ) : access === "unverified" ? (
              <AssistantAuthGate kind="unverified" returnPath={returnPath} email={user?.email ?? ""} onRecheck={() => refetchSession()} />
            ) : view === "history" ? (
              <AssistantHistory
                conversations={conversations}
                activeId={activeId}
                onOpen={openConversation}
                onNew={reset}
                onChanged={() => mutateConversations()}
              />
            ) : messages.length === 0 ? (
              <div className="flex flex-col gap-4" dir={rtl ? "rtl" : "ltr"}>
                <div className="flex gap-3 rounded-2xl bg-mint p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm">
                    <AssistantIcon className="size-full" />
                  </span>
                  <div className="flex flex-col gap-2">
                    <p className="text-xl font-bold text-heading">{copy.hello}</p>
                    <p className="text-sm leading-relaxed text-body">{copy.intro}</p>
                    <p className="text-sm font-semibold text-heading">{copy.ask}</p>
                  </div>
                </div>
                <ul className="grid grid-cols-2 gap-3">
                  {quickActions.map((a) => (
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
                {messages.map((m, i) => {
                  const text = textOf(m)
                  const meta = m.metadata as MessageMeta | undefined
                  if (!text.trim()) {
                    if (m.role !== "assistant" || !meta?.stored || meta.stored === "complete" || busy) return null
                    return (
                      <li key={m.id} className="flex flex-col items-start gap-2 rounded-2xl border border-line-light bg-surface px-3.5 py-2.5 text-sm text-body">
                        {meta.stored === "pending"
                          ? "This answer was still being prepared when the chat closed."
                          : "This answer couldn't be completed."}
                        {i === messages.length - 1 && (
                          <button
                            type="button"
                            onClick={retryLast}
                            disabled={limited}
                            className="flex h-8 items-center gap-1.5 rounded-full border border-green-border px-3 text-xs font-semibold text-green hover:bg-mint disabled:opacity-50"
                          >
                            <RotateCcw className="size-3.5" aria-hidden />
                            Try again
                          </button>
                        )}
                      </li>
                    )
                  }
                  const requestId = meta?.requestId
                  const settled = !busy || i < messages.length - 1
                  return (
                    <li key={m.id} className="flex flex-col gap-1">
                    <div className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                      {m.role === "assistant" && (
                        <span className="mt-1 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                          <AssistantIcon className="size-full" />
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
                    </div>
                    {m.role === "assistant" && settled && (
                      <div className="flex flex-wrap items-center gap-1 ps-9">
                        <CopyAnswer text={text} />
                        {requestId && <AssistantFeedback requestId={requestId} />}
                      </div>
                    )}
                    </li>
                  )
                })}
                {busy && lastAssistantEmpty && (
                  <li className="flex items-center gap-2 text-sm text-muted-2">
                    <span className="flex size-7 animate-pulse items-center justify-center overflow-hidden rounded-lg">
                      <AssistantIcon className="size-full" />
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
            {canChat && usage && limited && limitDismissed !== usage.resetAt && <LimitCard usage={usage} lang={lang} onDismiss={() => dismissLimit(usage.resetAt)} />}
            {canChat && usage && limited && limitDismissed === usage.resetAt && <LimitStatus usage={usage} lang={lang} />}
            {canChat && usage && !limited && <AllowanceLine usage={usage} lang={lang} />}
            {canChat && view === "chat" && <form
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
                placeholder={limited ? limitedPlaceholder(lang) : copy.placeholder}
                maxLength={2000}
                disabled={limited}
                dir="auto"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-sm text-heading outline-none placeholder:text-muted-2"
              />
              <button
                type="submit"
                disabled={busy || limited || !input.trim()}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-hover text-primary-foreground transition-colors hover:bg-green disabled:opacity-50"
                aria-label="Send question"
              >
                <SendHorizontal className="size-4.5" aria-hidden />
              </button>
            </form>}
            <div className="flex items-center justify-center" role="radiogroup" aria-label="Assistant language">
              <div className="flex items-center rounded-full border border-line-light bg-surface p-1">
                {languages.map((l) => (
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
        className="relative flex size-16 items-center justify-center rounded-2xl bg-green-hover text-primary-foreground shadow-xl shadow-green/30 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
      >
        {open ? (
          <X className="size-7" aria-hidden />
        ) : (
          <span className="flex size-full overflow-hidden rounded-2xl">
            <AssistantIcon className="size-full" priority />
          </span>
        )}
        {!seen && <span className="absolute -right-1 -top-1 size-4 rounded-full bg-destructive ring-2 ring-card" aria-hidden />}
      </button>
    </div>
  )
}

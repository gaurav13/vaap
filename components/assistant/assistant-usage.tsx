"use client"

import { Clock } from "lucide-react"
import Link from "next/link"
import type { UsageState } from "@/lib/ai-assistant/config"
import { cn } from "@/lib/utils"

type Lang = "en" | "ur" | "roman-ur"

const COPY: Record<
  Lang,
  {
    remaining: (n: number) => string
    reached: string
    title: string
    free: (n: number) => string
    included: (n: number) => string
    reset: (free: boolean, label: string, date: string) => string
    upgrade: string
    plans: string
    status: string
    signIn: string
  }
> = {
  en: {
    remaining: (n) => `${n} ${n === 1 ? "question" : "questions"} remaining today`,
    reached: "Daily limit reached",
    title: "You've reached your daily Ask VAAP AI limit.",
    free: (n) => `You've used all ${n} free questions available today.`,
    included: (n) => `You've used all ${n} questions included with your membership today.`,
    reset: (free, label, date) => `Your ${free ? "free " : ""}allowance will reset tomorrow at 12:00 AM ${label} (${date}).`,
    upgrade: "To continue using Ask VAAP AI with additional questions, upgrade to an eligible paid VAAP membership.",
    plans: "View Membership Plans",
    status: "Check My Membership",
    signIn: "Sign in",
  },
  ur: {
    remaining: (n) => `آج ${n} سوالات باقی ہیں`,
    reached: "روزانہ کی حد مکمل",
    title: "آپ Ask VAAP AI کی روزانہ حد تک پہنچ گئے ہیں۔",
    free: (n) => `آپ آج کے تمام ${n} مفت سوالات استعمال کر چکے ہیں۔`,
    included: (n) => `آپ اپنی ممبرشپ میں شامل آج کے تمام ${n} سوالات استعمال کر چکے ہیں۔`,
    reset: (_free, _label, date) => `آپ کی حد کل رات 12:00 بجے پاکستان وقت (${date}) دوبارہ شروع ہوگی۔`,
    upgrade: "مزید سوالات کے لیے اہل VAAP پیڈ ممبرشپ حاصل کریں۔",
    plans: "ممبرشپ پلانز دیکھیں",
    status: "میری ممبرشپ دیکھیں",
    signIn: "سائن ان کریں",
  },
  "roman-ur": {
    remaining: (n) => `Aaj ${n} sawal baqi hain`,
    reached: "Rozana limit poori",
    title: "Aap Ask VAAP AI ki rozana limit tak pohanch gaye hain.",
    free: (n) => `Aap aaj ke tamam ${n} free sawal istemal kar chuke hain.`,
    included: (n) => `Aap apni membership mein shamil aaj ke tamam ${n} sawal istemal kar chuke hain.`,
    reset: (_free, label, date) => `Aap ki limit kal raat 12:00 AM ${label} (${date}) reset hogi.`,
    upgrade: "Mazeed sawalon ke liye eligible paid VAAP membership lein.",
    plans: "Membership Plans Dekhein",
    status: "Meri Membership Dekhein",
    signIn: "Sign in karein",
  },
}

function track(target: "plans" | "status" | "signin") {
  const body = JSON.stringify({ target })
  if (!navigator.sendBeacon?.("/api/assistant/upgrade-click", new Blob([body], { type: "application/json" }))) {
    fetch("/api/assistant/upgrade-click", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {})
  }
}

export function AllowanceLine({ usage, lang }: { usage: UsageState; lang: Lang }) {
  const c = COPY[lang]
  const out = usage.remaining === 0
  return (
    <p
      className={cn("text-center text-xs font-medium", out ? "text-destructive" : usage.remaining <= 2 ? "text-gold" : "text-muted-2")}
      dir={lang === "ur" ? "rtl" : "ltr"}
      aria-live="polite"
    >
      {out ? c.reached : c.remaining(usage.remaining)}
    </p>
  )
}

export function LimitCard({ usage, lang }: { usage: UsageState; lang: Lang }) {
  const c = COPY[lang]
  const free = usage.tier === "guest" || usage.tier === "registered"
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: usage.resetTimeZone }).format(new Date(usage.resetAt))
  const link = "inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors"
  return (
    <div role="status" className="flex flex-col gap-3 rounded-2xl border border-gold/40 bg-mint p-4" dir={lang === "ur" ? "rtl" : "ltr"}>
      <div className="flex items-start gap-2">
        <Clock className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
        <p className="text-sm font-bold leading-snug text-heading">{c.title}</p>
      </div>
      <div className="flex flex-col gap-1.5 text-sm leading-relaxed text-body">
        <p>{free ? c.free(usage.limit) : c.included(usage.limit)}</p>
        <p>{c.reset(free, usage.resetLabel, date)}</p>
        {free && usage.paidUpgradesEnabled && <p>{c.upgrade}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {free && usage.paidUpgradesEnabled && (
          <Link href="/membership" onClick={() => track("plans")} className={cn(link, "bg-green-hover text-primary-foreground hover:bg-green")}>
            {c.plans}
          </Link>
        )}
        {usage.signedIn ? (
          <Link href="/dashboard/membership" onClick={() => track("status")} className={cn(link, "border border-line bg-card text-heading hover:border-green")}>
            {c.status}
          </Link>
        ) : (
          <Link href="/sign-in?callbackURL=/dashboard/membership" onClick={() => track("signin")} className={cn(link, "border border-line bg-card text-heading hover:border-green")}>
            {c.signIn}
          </Link>
        )}
      </div>
    </div>
  )
}

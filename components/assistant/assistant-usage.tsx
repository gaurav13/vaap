"use client"

import { Clock, X } from "lucide-react"
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
    cardTitle: string
    cardFree: string
    cardIncluded: string
    cardReset: (label: string) => string
    statusLine: string
    plansShort: string
    dismiss: string
    inputLimited: string
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
    cardTitle: "Daily AI Limit Reached",
    cardFree: "You've used all your free AI questions for today.",
    cardIncluded: "You've used all your included AI questions for today.",
    cardReset: (label) => `Your allowance resets tomorrow at 12:00 AM ${label}.`,
    statusLine: "Daily limit reached — resets tomorrow",
    plansShort: "View Plans",
    dismiss: "Dismiss daily limit notice",
    inputLimited: "Daily limit reached — resets tomorrow.",
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
    cardTitle: "روزانہ AI حد مکمل",
    cardFree: "آپ آج کے تمام مفت AI سوالات استعمال کر چکے ہیں۔",
    cardIncluded: "آپ آج کے تمام شامل AI سوالات استعمال کر چکے ہیں۔",
    cardReset: () => "آپ کی حد کل رات 12:00 بجے پاکستان وقت دوبارہ شروع ہوگی۔",
    statusLine: "روزانہ حد مکمل — کل دوبارہ شروع",
    plansShort: "پلانز دیکھیں",
    dismiss: "روزانہ حد کا پیغام بند کریں",
    inputLimited: "روزانہ حد مکمل — کل دوبارہ شروع ہوگی۔",
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
    cardTitle: "Rozana AI Limit Poori",
    cardFree: "Aap aaj ke tamam free AI sawal istemal kar chuke hain.",
    cardIncluded: "Aap aaj ke tamam shamil AI sawal istemal kar chuke hain.",
    cardReset: (label) => `Aap ki limit kal raat 12:00 AM ${label} reset hogi.`,
    statusLine: "Rozana limit poori — kal reset hogi",
    plansShort: "Plans Dekhein",
    dismiss: "Rozana limit ka paigham band karein",
    inputLimited: "Rozana limit poori — kal reset hogi.",
  },
}

export const limitedPlaceholder = (lang: Lang) => COPY[lang].inputLimited

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

function upgradeLink(usage: UsageState): { href: string; target: "plans" | "status" | "signin" } {
  const free = usage.tier === "guest" || usage.tier === "registered"
  if (free && usage.paidUpgradesEnabled) return { href: "/membership", target: "plans" }
  if (usage.signedIn) return { href: "/dashboard/membership", target: "status" }
  return { href: "/sign-in?callbackURL=/dashboard/membership", target: "signin" }
}

function linkLabel(c: (typeof COPY)[Lang], target: "plans" | "status" | "signin") {
  return target === "plans" ? c.plans : target === "status" ? c.status : c.signIn
}

export function LimitCard({ usage, lang, onDismiss }: { usage: UsageState; lang: Lang; onDismiss: () => void }) {
  const c = COPY[lang]
  const free = usage.tier === "guest" || usage.tier === "registered"
  const link = upgradeLink(usage)
  return (
    <div
      role="status"
      className="relative flex flex-col gap-1.5 rounded-xl border border-gold/40 bg-mint py-2.5 pe-10 ps-3"
      dir={lang === "ur" ? "rtl" : "ltr"}
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute end-1 top-1 flex size-8 items-center justify-center rounded-full text-body transition-colors hover:bg-card hover:text-heading focus-visible:outline-2 focus-visible:outline-green"
        aria-label={c.dismiss}
      >
        <X className="size-4" aria-hidden />
      </button>
      <p className="flex items-center gap-1.5 text-sm font-bold leading-snug text-heading">
        <Clock className="size-4 shrink-0 text-gold" aria-hidden />
        {c.cardTitle}
      </p>
      <p className="text-xs leading-relaxed text-body">
        {free ? c.cardFree : c.cardIncluded} {c.cardReset(usage.resetLabel)}
      </p>
      <Link
        href={link.href}
        onClick={() => track(link.target)}
        className="self-start text-xs font-semibold text-green-hover underline underline-offset-2 hover:text-green"
      >
        {linkLabel(c, link.target)}
      </Link>
    </div>
  )
}

export function LimitStatus({ usage, lang }: { usage: UsageState; lang: Lang }) {
  const c = COPY[lang]
  const link = upgradeLink(usage)
  return (
    <p className="text-center text-xs font-medium text-destructive" dir={lang === "ur" ? "rtl" : "ltr"} role="status">
      {c.statusLine}
      <span aria-hidden> · </span>
      <Link href={link.href} onClick={() => track(link.target)} className="font-semibold text-green-hover underline underline-offset-2 hover:text-green">
        {link.target === "plans" ? c.plansShort : linkLabel(c, link.target)}
      </Link>
    </p>
  )
}

"use client"

import { LockKeyhole, MailCheck } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { AssistantIcon } from "./assistant-icon"

type GateProps =
  | { kind: "signed-out"; returnPath: string }
  | { kind: "unverified"; returnPath: string; email: string; onRecheck: () => Promise<unknown> }

export function AssistantAuthGate(props: GateProps) {
  const redirect = encodeURIComponent(props.returnPath)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 rounded-2xl bg-mint p-4">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm">
          <AssistantIcon className="size-full" />
        </span>
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-base font-bold text-heading">
            {props.kind === "signed-out" ? (
              <LockKeyhole className="size-4 text-green" aria-hidden />
            ) : (
              <MailCheck className="size-4 text-green" aria-hidden />
            )}
            {props.kind === "signed-out" ? "Sign in to use Ask VAAP AI" : "Verify your email to continue"}
          </p>
          <p className="text-pretty text-sm leading-relaxed text-body">
            {props.kind === "signed-out"
              ? "Ask VAAP AI is available to registered VAAP members. Sign in or create a free account to ask questions, save your conversations and pick up where you left off on any device."
              : `We sent a verification link to ${props.email}. Open it to start using Ask VAAP AI.`}
          </p>
        </div>
      </div>
      {props.kind === "signed-out" ? <SignedOutActions redirect={redirect} returnPath={props.returnPath} /> : <VerifyActions {...props} />}
    </div>
  )
}

function SignedOutActions({ redirect, returnPath }: { redirect: string; returnPath: string }) {
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function google() {
    setError(null)
    setGoogleBusy(true)
    const { error } = await authClient.signIn
      .social({ provider: "google", callbackURL: returnPath, newUserCallbackURL: returnPath, errorCallbackURL: `/sign-in?redirect=${redirect}` })
      .catch(() => ({ error: { message: "Could not continue with Google." } }))
    if (error) {
      setError(error.message ?? "Could not continue with Google.")
      setGoogleBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Link
        href={`/sign-in?redirect=${redirect}`}
        className="flex h-11 items-center justify-center rounded-full bg-green-hover text-sm font-semibold text-primary-foreground transition-colors hover:bg-green"
      >
        Sign in
      </Link>
      <Link
        href={`/sign-up?redirect=${redirect}`}
        className="flex h-11 items-center justify-center rounded-full border border-green-border text-sm font-semibold text-green transition-colors hover:bg-mint"
      >
        Create a free account
      </Link>
      <button
        type="button"
        onClick={google}
        disabled={googleBusy}
        className="flex h-11 items-center justify-center rounded-full border border-line bg-card text-sm font-semibold text-heading transition-colors hover:border-green-border disabled:opacity-60"
      >
        {googleBusy ? "Opening Google..." : "Continue with Google"}
      </button>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function VerifyActions({ returnPath, onRecheck }: Extract<GateProps, { kind: "unverified" }>) {
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  async function resend() {
    setSending(true)
    setNotice(null)
    const res = await fetch("/api/assistant/resend-verification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callbackURL: `${returnPath}${returnPath.includes("?") ? "&" : "?"}assistant=open` }),
    }).catch(() => null)
    const data = (await res?.json().catch(() => null)) as { message?: string } | null
    setNotice({ ok: !!res?.ok, text: data?.message ?? "We couldn't send the email right now. Please try again shortly." })
    setSending(false)
  }

  async function recheck() {
    setChecking(true)
    await onRecheck()
    setChecking(false)
    setNotice({ ok: false, text: "Your email isn't verified yet. Open the link in the email we sent, then try again." })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={resend}
        disabled={sending}
        className="flex h-11 items-center justify-center rounded-full bg-green-hover text-sm font-semibold text-primary-foreground transition-colors hover:bg-green disabled:opacity-60"
      >
        {sending ? "Sending..." : "Resend verification email"}
      </button>
      <button
        type="button"
        onClick={recheck}
        disabled={checking}
        className="flex h-11 items-center justify-center rounded-full border border-green-border text-sm font-semibold text-green transition-colors hover:bg-mint disabled:opacity-60"
      >
        {checking ? "Checking..." : "I've verified my email"}
      </button>
      {notice && (
        <p role="status" className={notice.ok ? "text-center text-sm text-green" : "text-center text-sm text-body"}>
          {notice.text}
        </p>
      )}
    </div>
  )
}

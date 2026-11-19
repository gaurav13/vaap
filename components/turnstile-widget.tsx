"use client"

import { useEffect, useRef } from "react"

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
let scriptPromise: Promise<void> | null = null

function loadScript() {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script")
      s.src = SCRIPT_SRC
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        scriptPromise = null
        reject(new Error("Turnstile failed to load"))
      }
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

// Site keys are public. The fallback keeps the widget rendering if the
// build-time env var is missing, since the server still requires a token.
export const turnstileSiteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAGGAcZbM4sLvp0Hg"

/**
 * Renders a Cloudflare Turnstile challenge. Tokens are single-use, so remount
 * it (change its `key`) after every submit attempt to get a fresh one.
 */
export function TurnstileWidget({
  onToken,
  action,
}: {
  onToken: (token: string | null) => void
  action?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!turnstileSiteKey || !ref.current) return
    let widgetId: string | null = null
    let cancelled = false

    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return
        widgetId = window.turnstile.render(ref.current, {
          sitekey: turnstileSiteKey,
          appearance: "always",
          ...(action ? { action } : {}),
          callback: (t: string) => onTokenRef.current(t),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        })
      })
      .catch(() => onTokenRef.current(null))

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
      onTokenRef.current(null)
    }
  }, [action])

  if (!turnstileSiteKey) return null
  return <div ref={ref} className="min-h-16" aria-label="Security check" />
}

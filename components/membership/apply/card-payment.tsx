"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { Check, CreditCard, Loader2, RefreshCw } from "lucide-react"

import { createMembershipCheckout, getMembershipPaymentStatus } from "@/app/actions/stripe"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string)

type Status = "loading" | "ready" | "verifying" | "paid" | "free" | "error"

export function MembershipCardPayment({
  planId,
  name,
  email,
  paid,
  onPaid,
}: {
  planId: number
  name: string
  email: string
  paid: boolean
  onPaid: (sessionId: string) => void
}) {
  const [status, setStatus] = useState<Status>(paid ? "paid" : "loading")
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sessionIdRef = useRef<string>("")

  const start = useCallback(async () => {
    setStatus("loading")
    setError(null)
    setClientSecret(null)
    const res = await createMembershipCheckout({ planId, name, email })
    if (!res.ok) {
      setError(res.error)
      setStatus("error")
      return
    }
    if (res.free) {
      sessionIdRef.current = ""
      setStatus("free")
      onPaid("")
      return
    }
    sessionIdRef.current = res.sessionId
    setClientSecret(res.clientSecret)
    setStatus("ready")
  }, [planId, name, email, onPaid])

  // Create (or recreate) a checkout session whenever the plan changes and the
  // applicant hasn't already paid.
  useEffect(() => {
    if (paid) {
      setStatus("paid")
      return
    }
    void start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId])

  const handleComplete = useCallback(async () => {
    setStatus("verifying")
    const res = await getMembershipPaymentStatus(sessionIdRef.current)
    if (res.paid) {
      setStatus("paid")
      onPaid(sessionIdRef.current)
    } else {
      setError("We couldn't confirm your payment. If you were charged, please contact us.")
      setStatus("error")
    }
  }, [onPaid])

  const options = useMemo(
    () => (clientSecret ? { clientSecret, onComplete: handleComplete } : undefined),
    [clientSecret, handleComplete],
  )

  if (status === "paid") {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-green/30 bg-mint/40 p-5">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-green text-white">
          <Check className="size-5" strokeWidth={2.5} />
        </span>
        <div>
          <p className="text-sm font-bold text-heading">Payment successful</p>
          <p className="mt-1 text-sm text-body">
            Your card payment has been received. Continue to review and submit your application.
          </p>
        </div>
      </div>
    )
  }

  if (status === "free") {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-green/30 bg-mint/40 p-5">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-green text-white">
          <Check className="size-5" strokeWidth={2.5} />
        </span>
        <div>
          <p className="text-sm font-bold text-heading">No payment required</p>
          <p className="mt-1 text-sm text-body">
            This membership has no fee. Continue to review and submit your application.
          </p>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-5">
        <p className="text-sm font-medium text-destructive">{error ?? "Something went wrong."}</p>
        <button
          type="button"
          onClick={() => void start()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm font-semibold text-heading transition-colors hover:bg-muted"
        >
          <RefreshCw className="size-4" />
          Try again
        </button>
      </div>
    )
  }

  if (status === "verifying" || status === "loading" || !options) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-muted/40 p-6 text-sm text-muted-2">
        <Loader2 className="size-5 animate-spin text-green" />
        {status === "verifying" ? "Confirming your payment…" : "Loading secure card payment…"}
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-heading">
        <CreditCard className="size-4 text-green" />
        Enter your card details securely
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-card p-1">
        <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  )
}

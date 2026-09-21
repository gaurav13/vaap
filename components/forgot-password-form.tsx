"use client"

import type React from "react"

import { useState } from "react"
import { requestPasswordReset } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { VaapLogo } from "@/components/vaap-logo"
import Link from "next/link"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await requestPasswordReset({ email, redirectTo: "/reset-password" })
      if (error) {
        setError("Could not send a reset link. Please try again.")
        setLoading(false)
        return
      }
      setSent(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center gap-6 text-center">
        <Link href="/">
          <VaapLogo />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground text-balance">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Enter the email linked to your account and we&apos;ll send you a link to choose a new password.
          </p>
        </div>
      </div>

      {sent ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="rounded-lg bg-primary/10 px-3.5 py-3 text-sm text-foreground" role="status">
            If an account exists for <span className="font-medium">{email}</span>, a password reset link is on its way.
            Check your inbox and spam folder.
          </p>
          <Link href="/sign-in" className="text-sm font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={loading} className="mt-2">
            {loading ? "Sending…" : "Send reset link"}
          </Button>

          <Link href="/sign-in" className="text-center text-sm font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </form>
      )}
    </div>
  )
}

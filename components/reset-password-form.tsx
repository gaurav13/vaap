"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { resetPassword } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { VaapLogo } from "@/components/vaap-logo"
import Link from "next/link"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const invalidLink = !token || searchParams.get("error") === "invalid_token"

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const { error } = await resetPassword({ newPassword: password, token: token as string })
      if (error) {
        setError("This reset link is invalid or has expired. Please request a new one.")
        setLoading(false)
        return
      }
      router.push("/sign-in")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
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
          <h1 className="font-serif text-2xl font-bold text-foreground text-balance">Choose a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Enter a new password for your VAAP account.
          </p>
        </div>
      </div>

      {invalidLink ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="rounded-lg bg-destructive/10 px-3.5 py-3 text-sm text-destructive" role="alert">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Request a new link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="At least 8 characters"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirm" className="text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Re-enter your password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={loading} className="mt-2">
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </div>
  )
}

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { startTransition, useEffect } from "react"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()

  useEffect(() => {
    console.error("[app] route error:", error.digest ?? error.message)
  }, [error])

  function retry() {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted px-5 py-20">
      <div className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-green">Temporary problem</p>
        <h1 className="text-balance text-4xl font-bold text-heading md:text-5xl">We couldn&apos;t load this page</h1>
        <p className="text-pretty leading-relaxed text-body">
          This is usually a brief connection issue. Your data is safe. Please try again in a moment.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-green-hover"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-heading transition-colors hover:border-green hover:text-green"
          >
            Go to home
          </Link>
        </div>
        {error.digest && <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>}
      </div>
    </main>
  )
}

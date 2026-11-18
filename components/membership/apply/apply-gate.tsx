import Link from "next/link"
import { MailCheck, LogIn } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export function ApplyGate({ state, returnTo }: { state: "signed-out" | "unverified"; returnTo: string }) {
  const redirect = encodeURIComponent(returnTo)
  const unverified = state === "unverified"
  const Icon = unverified ? MailCheck : LogIn

  return (
    <section
      aria-labelledby="apply-gate-title"
      className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-10 text-center text-card-foreground"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h1 id="apply-gate-title" className="text-balance text-2xl font-semibold">
        {unverified ? "Verify your email to apply" : "Sign in to apply for membership"}
      </h1>
      <p className="text-pretty leading-relaxed text-muted-foreground">
        {unverified
          ? "We sent a verification link to your inbox. Open it to confirm your email address, then come back to continue your application."
          : "Membership applications are only accepted from accounts with a verified email address. Create an account or sign in to continue."}
      </p>
      {unverified ? (
        <Link href={`/sign-in?redirect=${redirect}`} className={buttonVariants()}>
          I have verified, sign in again
        </Link>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/sign-up?redirect=${redirect}`} className={buttonVariants()}>
            Create account
          </Link>
          <Link href={`/sign-in?redirect=${redirect}`} className={buttonVariants({ variant: "outline" })}>
            Sign in
          </Link>
        </div>
      )}
    </section>
  )
}

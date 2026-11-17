import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { confirmEmailChange, findEmailChange } from "@/lib/email-change"

export const metadata: Metadata = { title: "Confirm email address | VAAP", robots: { index: false } }

async function confirm(formData: FormData) {
  "use server"
  const token = String(formData.get("token") ?? "")
  const res = await confirmEmailChange(token)
  redirect(`/account/confirm-email?status=${res.ok ? "done" : "error"}${res.ok ? "" : `&message=${encodeURIComponent(res.error)}`}`)
}

export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; status?: string; message?: string }> }) {
  const { token, status, message } = await searchParams
  const found = status ? null : await findEmailChange(token)

  let title = "Confirm your new email address"
  let body: React.ReactNode = null
  if (status === "done") {
    title = "Email address confirmed"
    body = <p className="text-muted-foreground leading-relaxed">Your VAAP account now uses this address. Sign in with it from now on.</p>
  } else if (status === "error") {
    title = "We could not confirm this change"
    body = <p className="text-muted-foreground leading-relaxed">{message || "The link is invalid or has expired."}</p>
  } else if (!found || found.state !== "open") {
    title = "This link is no longer valid"
    body = <p className="text-muted-foreground leading-relaxed">Ask the VAAP membership team to send a new confirmation link.</p>
  } else {
    body = (
      <form action={confirm} className="flex flex-col gap-4">
        <p className="text-muted-foreground leading-relaxed">
          Confirm that <strong className="text-foreground">{found.req.newEmail}</strong> belongs to you. Your account will switch from your previous address to this one.
        </p>
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90">
          Confirm email address
        </button>
      </form>
    )
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-bold text-heading text-balance">{title}</h1>
        {body}
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Go to sign in
        </Link>
      </div>
    </main>
  )
}

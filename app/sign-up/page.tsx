import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"

export default async function SignUpPage() {
  const session = await getSession()
  if (session?.user) redirect("/dashboard")

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-16">
      <Suspense>
        <AuthForm mode="sign-up" />
      </Suspense>
    </main>
  )
}

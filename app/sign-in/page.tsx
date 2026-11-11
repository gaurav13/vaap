import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const session = await getSession()
  if (session?.user) {
    const target = (await searchParams).redirect
    redirect(target && target.startsWith("/") && !target.startsWith("//") && !target.includes("\\") ? target : "/dashboard")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-16">
      <Suspense>
        <AuthForm mode="sign-in" />
      </Suspense>
    </main>
  )
}

import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { verifyToken } from "@/lib/email-tokens"
import { suppress } from "@/lib/email-automations/engine"
import { getAutomation } from "@/lib/email-automations/definitions"

export const metadata = { title: "Email preferences | VAAP", robots: { index: false } }

async function unsubscribe(formData: FormData) {
  "use server"
  const token = String(formData.get("token") ?? "")
  const scope = formData.get("scope") === "all" ? "all" : "topic"
  const payload = verifyToken(token, "unsubscribe")
  if (!payload?.topic) redirect("/email/unsubscribe?status=invalid")
  await suppress(payload.email, scope === "all" ? "all" : payload.topic, "Unsubscribed via email link", "recipient")
  revalidatePath("/admin/emails/automations")
  redirect(`/email/unsubscribe?status=done&scope=${scope}`)
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string; scope?: string }>
}) {
  const sp = await searchParams
  const payload = sp.status ? null : verifyToken(sp.token, "unsubscribe")
  const topicName = payload?.topic ? getAutomation(payload.topic)?.name ?? "these emails" : ""

  return (
    <main className="flex min-h-svh items-center justify-center bg-surface px-5 py-16">
      <div className="w-full max-w-md rounded-xl border border-line bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-green">VAAP email preferences</p>
        {sp.status === "done" ? (
          <>
            <h1 className="mt-3 font-serif text-2xl font-bold text-heading text-balance">You have been unsubscribed</h1>
            <p className="mt-3 leading-relaxed text-muted-2">
              {sp.scope === "all"
                ? "You will no longer receive VAAP engagement emails. Account and membership emails will still arrive."
                : "You will no longer receive this type of email from VAAP."}
            </p>
          </>
        ) : payload ? (
          <>
            <h1 className="mt-3 font-serif text-2xl font-bold text-heading text-balance">Unsubscribe from {topicName}?</h1>
            <p className="mt-3 leading-relaxed text-muted-2">
              {"This applies to "}
              <span className="font-semibold text-heading">{payload.email}</span>.
            </p>
            <form action={unsubscribe} className="mt-6 flex flex-col gap-3">
              <input type="hidden" name="token" value={sp.token} />
              <button
                name="scope"
                value="topic"
                className="rounded-md bg-green px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Unsubscribe from {topicName}
              </button>
              <button
                name="scope"
                value="all"
                className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-heading hover:bg-surface"
              >
                Unsubscribe from all engagement emails
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-serif text-2xl font-bold text-heading">This link is invalid or has expired</h1>
            <p className="mt-3 leading-relaxed text-muted-2">Use the unsubscribe link from a more recent VAAP email.</p>
          </>
        )}
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-green hover:underline">
          Back to VAAP
        </Link>
      </div>
    </main>
  )
}

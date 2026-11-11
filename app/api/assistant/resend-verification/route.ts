import { sql } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getSession } from "@/lib/session"

const COOLDOWN_SECONDS = 60
const MAX_PER_DAY = 5

function safeCallback(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && value.length < 300 ? value : "/"
}

export async function POST(req: Request) {
  const session = await getSession().catch(() => null)
  const user = session?.user as { id: string; email: string; emailVerified?: boolean } | undefined
  if (!user?.id) return Response.json({ message: "Please sign in first." }, { status: 401 })
  if (user.emailVerified) return Response.json({ message: "Your email is already verified." }, { status: 409 })

  const body = (await req.json().catch(() => null)) as { callbackURL?: unknown } | null
  const dayKey = new Date().toISOString().slice(0, 10)

  // Claims a send slot atomically: returns no row while in the cooldown or once the daily cap is reached.
  const claimed = await db.execute(sql`
    insert into email_verification_sends ("userId", "lastSentAt", "dayKey", "dayCount")
    values (${user.id}, now(), ${dayKey}, 1)
    on conflict ("userId") do update set
      "lastSentAt" = now(),
      "dayCount" = case when email_verification_sends."dayKey" = excluded."dayKey" then email_verification_sends."dayCount" + 1 else 1 end,
      "dayKey" = excluded."dayKey"
    where email_verification_sends."lastSentAt" < now() - make_interval(secs => ${COOLDOWN_SECONDS})
      and (email_verification_sends."dayKey" <> excluded."dayKey" or email_verification_sends."dayCount" < ${MAX_PER_DAY})
    returning "userId"
  `)
  if (claimed.rows.length === 0) {
    return Response.json(
      { message: "A verification email was sent recently. Please check your inbox, or try again in a little while." },
      { status: 429 },
    )
  }

  try {
    await auth.api.sendVerificationEmail({
      body: { email: user.email, callbackURL: safeCallback(body?.callbackURL) },
      headers: await headers(),
    })
    return Response.json({ message: `Verification email sent to ${user.email}.` })
  } catch (err) {
    console.error("[assistant] resend verification failed:", err instanceof Error ? err.message : err)
    return Response.json({ message: "We couldn't send the email right now. Please try again shortly." }, { status: 502 })
  }
}

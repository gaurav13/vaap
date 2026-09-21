// Central notification helper. Writes an in-app notification row and, when an
// email template is supplied, also sends a branded email from the official
// support address. Server-only: invoked by server actions and auth hooks,
// never from the client. A failure here must never break the calling flow, so
// every step is wrapped and errors are logged rather than thrown.

import "server-only"
import { db } from "@/lib/db"
import { notifications, user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { sendEmail, brandedEmail } from "@/lib/mailer"

export type NotifyType =
  | "info"
  | "success"
  | "account"
  | "security"
  | "membership"
  | "application"
  | "reward"
  | "alert"

type EmailTemplate = {
  subject: string
  heading: string
  intro: string | string[]
  ctaLabel?: string
  /** Path (e.g. "/dashboard") or absolute URL for the email button. */
  ctaPath?: string
  footnote?: string
}

type NotifyOptions = {
  /** Target user id. If absent but `email` is set, it is resolved from the user table. */
  userId?: string | null
  /** Target email. Used to resolve a user id and/or as the email recipient. */
  email?: string | null
  /** Broadcast to every user with this role (e.g. "admin", "staff"). */
  role?: string | null
  type?: NotifyType
  title: string
  body?: string
  /** In-app deep link. */
  link?: string
  /** When provided, also send a branded email to the resolved recipient. */
  emailTemplate?: EmailTemplate
}

/** Resolve an absolute base URL for links inside emails. */
function baseUrl() {
  return (
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL) ||
    ""
  )
}

function toAbsolute(path?: string) {
  if (!path) return undefined
  if (/^https?:\/\//.test(path)) return path
  const base = baseUrl().replace(/\/$/, "")
  return base ? `${base}${path.startsWith("/") ? "" : "/"}${path}` : path
}

export async function notify(opts: NotifyOptions): Promise<void> {
  const { role, type = "info", title, body = "", link = "", emailTemplate } = opts
  let userId = opts.userId ?? null
  let email = opts.email?.toLowerCase() ?? null

  // Fill in whichever of {userId, email} we're missing from the user table.
  try {
    if (!userId && email) {
      const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
      userId = u?.id ?? null
    } else if (userId && !email) {
      const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1)
      email = u?.email?.toLowerCase() ?? null
    }
  } catch (err) {
    console.log("[v0] notify: user lookup failed:", err instanceof Error ? err.message : err)
  }

  // In-app notification. Needs either a concrete user or a role broadcast.
  if (userId || role) {
    try {
      await db.insert(notifications).values({
        userId: userId ?? null,
        role: role ?? null,
        type,
        title,
        body,
        link,
      })
    } catch (err) {
      console.log("[v0] notify: insert failed:", err instanceof Error ? err.message : err)
    }
  }

  // Optional branded email to the resolved recipient.
  if (emailTemplate && email) {
    try {
      const { subject, html, text } = brandedEmail({
        subject: emailTemplate.subject,
        heading: emailTemplate.heading,
        intro: emailTemplate.intro,
        ctaLabel: emailTemplate.ctaLabel,
        ctaUrl: toAbsolute(emailTemplate.ctaPath),
        footnote: emailTemplate.footnote,
      })
      const sent = await sendEmail({ to: email, subject, html, text })
      if (!sent) {
        console.log(`[v0] notify: email not configured, would send "${subject}" to ${email}`)
      }
    } catch (err) {
      console.log("[v0] notify: email send failed:", err instanceof Error ? err.message : err)
    }
  }
}

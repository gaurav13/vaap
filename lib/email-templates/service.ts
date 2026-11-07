import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { emailTemplates } from "@/lib/db/schema"
import { sendEmail } from "@/lib/mailer"
import { CONTACT_EMAIL } from "@/lib/contact"
import { getTemplateDefinition, type EmailContent, type EmailTemplateKey } from "./registry"
import { renderEmail } from "./render"

/** Absolute site origin for links inside emails. */
export function appBaseUrl() {
  return (
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_ENV === "production" ? "https://vaap.org.pk" : "") ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL) ||
    ""
  )
}

export const emailSupportAddress = CONTACT_EMAIL

/** Fills any missing fields from the code defaults so older saves stay valid. */
export function withDefaults(key: string, content: Partial<EmailContent> | null | undefined): EmailContent {
  const def = getTemplateDefinition(key)
  if (!def) throw new Error(`Unknown email template: ${key}`)
  return { ...def.defaults, ...(content ?? {}) }
}

/**
 * Content that live emails use: the last *published* version, never a draft.
 * Falls back to code defaults if the template was never edited or the
 * database is unreachable, so triggers never stop sending.
 */
export async function getLiveContent(key: EmailTemplateKey): Promise<EmailContent> {
  try {
    const [row] = await db
      .select({ publishedContent: emailTemplates.publishedContent })
      .from(emailTemplates)
      .where(eq(emailTemplates.key, key))
      .limit(1)
    return withDefaults(key, row?.publishedContent)
  } catch (err) {
    console.log("[v0] email template lookup failed, using default:", err instanceof Error ? err.message : err)
    return withDefaults(key, null)
  }
}

export function renderWith(
  content: EmailContent,
  vars: Record<string, string | undefined>,
  opts: { unsubscribeUrl?: string } = {},
) {
  return renderEmail(content, vars, { baseUrl: appBaseUrl(), supportEmail: emailSupportAddress, ...opts })
}

/** Renders the live version of a template and sends it. Returns true when delivered. */
export async function sendTemplateEmail({
  to,
  key,
  vars,
}: {
  to: string
  key: EmailTemplateKey
  vars: Record<string, string | undefined>
}) {
  const content = await getLiveContent(key)
  const { subject, html, text } = renderWith(content, vars)
  return sendEmail({ to, subject, html, text, templateKey: key })
}

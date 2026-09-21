import "server-only"
import nodemailer, { type Transporter } from "nodemailer"

const GMAIL_USER = process.env.GMAIL_USER
// Prefer GMAIL_SMTP_PASSWORD (a fresh variable that saves cleanly); fall back to
// the legacy GMAIL_APP_PASSWORD. Whitespace is stripped so the 4x4 App Password
// format ("abcd efgh ijkl mnop") can be pasted as-is.
const GMAIL_APP_PASSWORD = (process.env.GMAIL_SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "")

// Official sender identity for every outgoing VAAP email. Overridable via
// EMAIL_FROM, but defaults to the association's support mailbox. Note: Gmail
// SMTP only lets you send "From" this address if it is the authenticated
// GMAIL_USER or a verified "Send mail as" alias on that account.
const EMAIL_FROM = process.env.EMAIL_FROM || "support@vaap.org.pk"
const EMAIL_FROM_NAME = "Virtual Assets Association of Pakistan"

let transporter: Transporter | null = null

function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        // App Password (16 chars) — NOT the normal Gmail password.
        pass: GMAIL_APP_PASSWORD,
      },
    })
  }
  return transporter
}

export function isEmailConfigured() {
  return Boolean(GMAIL_USER && GMAIL_APP_PASSWORD)
}

type SendEmailArgs = {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Sends an email via Gmail SMTP. Returns true if sent, false if email is not
 * configured (in which case callers should fall back to logging).
 */
export async function sendEmail({ to, subject, html, text }: SendEmailArgs): Promise<boolean> {
  const tx = getTransporter()
  if (!tx) return false

  await tx.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
    // Replies always route to the official support mailbox.
    replyTo: EMAIL_FROM,
    to,
    subject,
    html,
    text,
  })
  return true
}

/** The address every VAAP email is sent from. */
export const supportEmail = EMAIL_FROM

type BrandedEmailArgs = {
  subject: string
  heading: string
  /** One or more paragraphs of body copy. */
  intro: string | string[]
  ctaLabel?: string
  ctaUrl?: string
  footnote?: string
}

/**
 * Shared branded HTML/text wrapper so every notification email looks
 * consistent and always shows the official support address in the footer.
 */
export function brandedEmail({ subject, heading, intro, ctaLabel, ctaUrl, footnote }: BrandedEmailArgs) {
  const paragraphs = Array.isArray(intro) ? intro : [intro]
  const bodyHtml = paragraphs
    .map(
      (p) =>
        `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#1f2937">${p}</p>`,
    )
    .join("")
  const button =
    ctaLabel && ctaUrl
      ? `<p style="margin:8px 0 24px"><a href="${ctaUrl}" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600">${ctaLabel}</a></p>`
      : ""
  const foot = footnote
    ? `<p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">${footnote}</p>`
    : ""

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
    <div style="border-bottom:2px solid #15803d;padding-bottom:12px;margin-bottom:20px">
      <span style="font-size:13px;font-weight:700;letter-spacing:.5px;color:#14532d;text-transform:uppercase">Virtual Assets Association of Pakistan</span>
    </div>
    <h1 style="font-size:20px;margin:0 0 16px;color:#14532d">${heading}</h1>
    ${bodyHtml}
    ${button}
    ${foot}
    <p style="font-size:12px;line-height:1.6;color:#9ca3af;margin:24px 0 0;border-top:1px solid #e5e7eb;padding-top:16px">
      This is an automated message from the Virtual Assets Association of Pakistan.
      Questions? Reach us at <a href="mailto:${EMAIL_FROM}" style="color:#15803d">${EMAIL_FROM}</a>.
    </p>
  </div>`

  const textParts = [
    heading,
    "",
    ...paragraphs,
    "",
    ctaLabel && ctaUrl ? `${ctaLabel}: ${ctaUrl}` : "",
    footnote ?? "",
    "",
    `— Virtual Assets Association of Pakistan · ${EMAIL_FROM}`,
  ].filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))

  return { subject, html, text: textParts.join("\n") }
}

export function passwordResetEmail(url: string) {
  const subject = "Reset your VAAP password"
  const text = `You requested a password reset for your VAAP account.\n\nUse this link to choose a new password:\n${url}\n\nIf you did not request this, you can safely ignore this email. The link will expire shortly.`
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
    <h1 style="font-size:20px;margin:0 0 16px;color:#14532d">Reset your VAAP password</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px">
      You requested a password reset for your Virtual Assets Association of Pakistan account.
      Click the button below to choose a new password.
    </p>
    <p style="margin:0 0 24px">
      <a href="${url}" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600">
        Choose a new password
      </a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size:13px;line-height:1.6;word-break:break-all;margin:0 0 20px">
      <a href="${url}" style="color:#15803d">${url}</a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0">
      If you did not request this, you can safely ignore this email. The link will expire shortly.
    </p>
  </div>`
  return { subject, text, html }
}

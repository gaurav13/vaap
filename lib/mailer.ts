import "server-only"
import nodemailer from "nodemailer"

const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD

let transporter: nodemailer.Transporter | null = null

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
    from: `"Virtual Assets Association of Pakistan" <${GMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  })
  return true
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

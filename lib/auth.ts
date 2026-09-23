import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"
import { sendEmail, passwordResetEmail, brandedEmail } from "@/lib/mailer"
import { notify } from "@/lib/notifications"

const configuredOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.V0_RUNTIME_URL,
  process.env.V0_DEV_APP_URL,
  process.env.V0_BUILD_URL,
  process.env.V0_SANDBOX_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined,
].filter((origin): origin is string => Boolean(origin))

export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // Sends the reset link via Gmail SMTP when GMAIL_USER/GMAIL_APP_PASSWORD
    // are set; otherwise falls back to logging the link to the server logs.
    sendResetPassword: async ({ user, url }) => {
      const { subject, html, text } = passwordResetEmail(url)
      const sent = await sendEmail({ to: user.email, subject, html, text })
      if (!sent) {
        throw new Error("Password reset email is not configured")
      }
    },
  },
  // Send a verification email on sign-up. Verification is not *required* to log
  // in (autoSignIn stays on), so this is a gentle confirm-your-address prompt
  // rather than a hard gate.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { subject, html, text } = brandedEmail({
        subject: "Verify your VAAP email address",
        heading: "Confirm your email address",
        intro: [
          `Welcome to the Virtual Assets Association of Pakistan, ${user.name || "there"}.`,
          "Please confirm this email address so we can keep your account and membership updates secure.",
        ],
        ctaLabel: "Verify email address",
        ctaUrl: url,
        footnote: "If you didn't create a VAAP account, you can safely ignore this email.",
      })
      const sent = await sendEmail({ to: user.email, subject, html, text })
      if (!sent) {
        throw new Error("Verification email is not configured")
      }
    },
    afterEmailVerification: async (verifiedUser) => {
      await notify({
        userId: verifiedUser.id,
        type: "account",
        title: "Email address verified",
        body: "Your email address has been confirmed. Your VAAP account is fully set up.",
        link: "/dashboard",
      })
    },
  },
  // Fire notifications on account creation (welcome) and every new sign-in
  // (security alert). Hooks never block auth: failures are swallowed by notify.
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await notify({
            userId: createdUser.id,
            email: createdUser.email,
            type: "account",
            title: "Welcome to VAAP",
            body: "Your account has been created. Explore your member dashboard to get started.",
            link: "/dashboard",
            emailTemplate: {
              subject: "Welcome to the Virtual Assets Association of Pakistan",
              heading: `Welcome aboard, ${createdUser.name || "member"}`,
              intro: [
                "Thank you for joining the Virtual Assets Association of Pakistan.",
                "Your account is ready. From your dashboard you can manage your profile, track your membership, register to vote, and stay up to date with events and resources.",
              ],
              ctaLabel: "Open your dashboard",
              ctaPath: "/dashboard",
            },
          })
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          await notify({
            userId: session.userId,
            type: "security",
            title: "New sign-in to your account",
            body: `A new sign-in was detected on ${new Date().toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}. If this wasn't you, reset your password.`,
            link: "/dashboard/settings",
            emailTemplate: {
              subject: "New sign-in to your VAAP account",
              heading: "New sign-in detected",
              intro: [
                "A new sign-in was detected on your VAAP account.",
                "If this was you, no action is needed. If you do not recognize this activity, reset your password immediately.",
              ],
              ctaLabel: "Review account security",
              ctaPath: "/dashboard/settings",
            },
          })
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "member",
        // Users cannot set their own role at sign-up; roles are assigned by admins.
        input: false,
      },
    },
  },
  // The preview runtime can use different exact hostnames depending on whether
  // the request comes from the v0 iframe, the build URL, or the sandbox URL.
  // Keep all platform-provided exact origins trusted regardless of NODE_ENV;
  // NODE_ENV is not reliable in the v0 preview runtime.
  trustedOrigins: ["http://localhost:3000", ...configuredOrigins],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          // In dev (v0 preview iframe), force cross-site cookies so the
          // session cookie is stored by the browser.
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})

import { existsSync, readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"

const DEFAULT_ADMIN_EMAIL = "admin@vaap.org.pk"
const DEFAULT_ADMIN_PASSWORD = "VaapAdmin#2026!Secure"

// Load env files before the database pool is created. Existing process.env
// values win; .env.local overrides .env, matching Next.js.
function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const values: Record<string, string> = {}
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

const fromFiles = { ...readEnvFile(".env"), ...readEnvFile(".env.local") }
for (const [key, value] of Object.entries(fromFiles)) {
  if (process.env[key] === undefined) process.env[key] = value
}

async function seed() {
  const explicitEmail = process.env.ADMIN_EMAIL?.trim() ?? ""
  const explicitPassword = process.env.ADMIN_PASSWORD ?? ""
  const explicit = explicitEmail.length > 0 && explicitPassword.length > 0
  const email = (explicitEmail || DEFAULT_ADMIN_EMAIL).toLowerCase()
  const password = explicitPassword || DEFAULT_ADMIN_PASSWORD

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.")
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to the environment or .env.local.")
  }

  const { db, pool } = await import("../lib/db")
  const { account, user } = await import("../lib/db/schema")
  const { and, eq, sql } = await import("drizzle-orm")

  try {
    const [existingEmail] = await db
      .select({ id: user.id })
      .from(user)
      .where(sql`lower(${user.email}) = ${email}`)
      .limit(1)

    // Fallback credentials only bootstrap the first admin. An explicit
    // ADMIN_EMAIL and ADMIN_PASSWORD always create or update that user.
    if (!explicit) {
      const [existingAdmin] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.role, "admin"))
        .limit(1)

      if (existingAdmin) {
        console.log("A super admin already exists. Skipping admin seed.")
        return
      }
      if (existingEmail) {
        console.log(`A user with ${email} already exists. Skipping admin seed.`)
        return
      }
    }

    const hash = await hashPassword(password)
    const now = new Date()
    let userId = existingEmail?.id

    if (userId) {
      await db
        .update(user)
        .set({ role: "admin", emailVerified: true, updatedAt: now })
        .where(eq(user.id, userId))
    } else {
      userId = randomUUID()
      await db.insert(user).values({
        id: userId,
        name: "Super Admin",
        email,
        emailVerified: true,
        // Schema super-admin role. Permissions check role === "admin".
        role: "admin",
        createdAt: now,
        updatedAt: now,
      })
    }

    const [credential] = await db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
      .limit(1)

    if (credential) {
      await db.update(account).set({ password: hash, updatedAt: now }).where(eq(account.id, credential.id))
    } else {
      await db.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hash,
        createdAt: now,
        updatedAt: now,
      })
    }

    console.log(`${existingEmail ? "Updated" : "Created"} super admin ${email}.`)
  } finally {
    await pool.end()
  }
}

seed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Admin seed failed"
  console.error(message)
  process.exit(1)
})

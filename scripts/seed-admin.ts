import { existsSync, readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"

// Load env before the database module reads DATABASE_URL. Platform variables
// win; otherwise .env.local overrides .env, matching Next.js.
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
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? ""
  const password = process.env.ADMIN_PASSWORD ?? ""

  if (!email || !password) {
    console.log("ADMIN_EMAIL or ADMIN_PASSWORD is unset. Skipping admin seed.")
    return
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.")
  }

  const { db, pool } = await import("../lib/db")
  const { account, user } = await import("../lib/db/schema")
  const { auth } = await import("../lib/auth")
  const { eq, sql } = await import("drizzle-orm")

  try {
    const [existingAdmin] = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.role, "admin"))
      .limit(1)

    if (existingAdmin) {
      console.log("A super admin already exists. Skipping admin seed.")
      return
    }

    const [existingEmail] = await db
      .select({ id: user.id })
      .from(user)
      .where(sql`lower(${user.email}) = ${email}`)
      .limit(1)

    if (existingEmail) {
      console.log("A user with ADMIN_EMAIL already exists. Skipping admin seed.")
      return
    }

    // Same hasher Better Auth uses for email/password sign-in (ctx.password.hash).
    const ctx = await auth.$context
    const hash = await ctx.password.hash(password)
    const userId = randomUUID()
    const now = new Date()

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

    await db.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hash,
      createdAt: now,
      updatedAt: now,
    })

    console.log(`Created super admin ${email}.`)
  } finally {
    await pool.end()
  }
}

seed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Admin seed failed"
  console.error(message)
  process.exit(1)
})

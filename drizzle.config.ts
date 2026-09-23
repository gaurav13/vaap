import { existsSync, readFileSync } from "node:fs"
import { defineConfig } from "drizzle-kit"

// Next.js keeps DATABASE_URL in .env.local. Platform env (already set) wins;
// otherwise .env.local overrides .env, matching Next's load order.
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

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error("DATABASE_URL is not set. Add it to the environment or .env.local.")
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
})

import { drizzle } from "drizzle-orm/node-postgres"
import { Pool, type PoolConfig } from "pg"
import * as schema from "./schema"

function poolConfig(connectionString: string | undefined): PoolConfig {
  if (!connectionString) return {}

  const query = connectionString.split("?")[1]?.split("#")[0] ?? ""
  const sslmode = new URLSearchParams(query).get("sslmode")?.toLowerCase()

  const config: PoolConfig = { connectionString }
  // node-postgres enables TLS for sslmode=require and several aliases.
  // An explicit disable must win so plain postgresql:// URLs are not forced onto SSL.
  if (sslmode === "disable") config.ssl = false
  return config
}

export const pool = new Pool(poolConfig(process.env.DATABASE_URL))

export const db = drizzle(pool, { schema })


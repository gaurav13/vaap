import { attachDatabasePool } from "@vercel/functions"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool, type PoolConfig } from "pg"
import * as schema from "./schema"

// The database is a single self-hosted Postgres with max_connections=100. Every
// serverless instance gets its own pool, so an unbounded pool with no idle
// timeout (the pg default) left dozens of idle connections parked per instance
// until Postgres ran out of slots and new requests failed. Keep each pool small
// and release idle connections quickly; attachDatabasePool lets Vercel drain
// them before an instance is suspended.
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX) || 5

function poolConfig(connectionString: string | undefined): PoolConfig {
  const config: PoolConfig = {
    connectionString,
    max: POOL_MAX,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    allowExitOnIdle: true,
  }
  if (!connectionString) return config

  const query = connectionString.split("?")[1]?.split("#")[0] ?? ""
  const sslmode = new URLSearchParams(query).get("sslmode")?.toLowerCase()
  // node-postgres enables TLS for sslmode=require and several aliases.
  // An explicit disable must win so plain postgresql:// URLs are not forced onto SSL.
  if (sslmode === "disable") config.ssl = false
  return config
}

// Failures that happen before the query reaches Postgres, so retrying can never
// run a statement twice.
const CONNECT_ERROR_CODES = new Set(["ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND", "53300", "57P03", "08001", "08004"])
// Connection dropped mid-flight. Only safe to retry for read-only statements.
const DROPPED_ERROR_CODES = new Set(["ECONNRESET", "EPIPE", "57P01", "08006", "08003"])

type PgError = Error & { code?: string }

function isConnectError(error: unknown) {
  const e = error as PgError
  return Boolean(
    e &&
      ((e.code && CONNECT_ERROR_CODES.has(e.code)) ||
        /timeout exceeded when trying to connect|too many clients|remaining connection slots/i.test(e.message ?? "")),
  )
}

function isDroppedError(error: unknown) {
  const e = error as PgError
  return Boolean(
    e && ((e.code && DROPPED_ERROR_CODES.has(e.code)) || /Connection terminated|server closed the connection/i.test(e.message ?? "")),
  )
}

function isReadOnly(args: unknown[]) {
  const first = args[0] as string | { text?: string } | undefined
  const text = typeof first === "string" ? first : first?.text
  return typeof text === "string" && /^\s*(select|with|show)\b/i.test(text)
}

const RETRY_DELAYS_MS = [150, 500]
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetry<T>(run: () => Promise<T>, canRetry: (error: unknown) => boolean): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run()
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length || !canRetry(error)) throw error
      console.warn(`[db] transient error (${(error as PgError).code ?? (error as Error).message}), retry ${attempt + 1}`)
      await sleep(RETRY_DELAYS_MS[attempt])
    }
  }
}

class ResilientPool extends Pool {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override query(...args: any[]): any {
    if (typeof args[args.length - 1] === "function") return super.query(...(args as Parameters<Pool["query"]>))
    const readOnly = isReadOnly(args)
    return withRetry(
      () => super.query(...(args as Parameters<Pool["query"]>)) as unknown as Promise<unknown>,
      (error) => isConnectError(error) || (readOnly && isDroppedError(error)),
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override connect(...args: any[]): any {
    if (typeof args[0] === "function") return super.connect(args[0])
    return withRetry(() => super.connect(), isConnectError)
  }
}

function createPool() {
  const created = new ResilientPool(poolConfig(process.env.DATABASE_URL))
  // Without a listener, an idle client dropped by the server emits an unhandled
  // 'error' event that crashes the whole function instance.
  created.on("error", (error) => {
    console.error("[db] idle client error:", (error as PgError).code ?? error.message)
  })
  attachDatabasePool(created)
  return created
}

const globalForDb = globalThis as unknown as { __vaapPool?: ResilientPool }

// Reuse one pool across hot reloads in development instead of leaking a new
// pool on every edit.
export const pool: Pool = globalForDb.__vaapPool ?? createPool()
if (process.env.NODE_ENV !== "production") globalForDb.__vaapPool = pool as ResilientPool

export const db = drizzle(pool, { schema })

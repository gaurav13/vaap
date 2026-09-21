const fs = require("fs")
const path = require("path")
const { Pool } = require("pg")

async function main() {
  const file = process.argv[2]
  if (!file) throw new Error("usage: node run-sql.cjs <file.sql>")
  const sql = fs.readFileSync(path.resolve(file), "utf8")
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try {
    await client.query(sql)
    console.log("[v0] SQL applied:", file)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error("[v0] SQL failed:", err.message)
  process.exit(1)
})

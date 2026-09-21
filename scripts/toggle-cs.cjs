const { Pool } = require("/vercel/share/v0-project/node_modules/.pnpm/pg@8.23.0/node_modules/pg/lib/index.js")
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const val = process.argv[2]
;(async () => {
  await pool.query("INSERT INTO site_settings (key, value) VALUES ('coming_soon', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [val])
  const { rows } = await pool.query("SELECT key, value FROM site_settings WHERE key = 'coming_soon'")
  console.log(JSON.stringify(rows))
  await pool.end()
})()

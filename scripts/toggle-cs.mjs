import { neon } from "/index.mjs"
const sql = neon(process.env.DATABASE_URL)
const val = process.argv[2]
await sql`INSERT INTO site_settings (key, value) VALUES ('coming_soon', ${val}) ON CONFLICT (key) DO UPDATE SET value = ${val}`
const rows = await sql`SELECT key, value FROM site_settings WHERE key = 'coming_soon'`
console.log(JSON.stringify(rows))

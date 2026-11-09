// One-off: move base64 data-URL images out of the database into DigitalOcean
// Spaces as resized WebP. Inline images were serialized into every page's HTML
// and RSC payload (several MB on the homepage). Originals are kept in
// inline_image_backup so the change is reversible.
//
// Usage: node --env-file-if-exists=/vercel/share/.env.project scripts/migrate-inline-images.mjs [--dry-run]
import pg from "pg"
import sharp from "sharp"
import { randomUUID } from "node:crypto"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

const TARGETS = [
  { table: "media_highlights", column: "image", folder: "pages", width: 1280 },
  { table: "leadership", column: "photo", folder: "pages", width: 800 },
  { table: "committees", column: "headPhoto", folder: "pages", width: 800 },
  { table: "user", column: "image", folder: "pages", width: 256 },
]

const dryRun = process.argv.includes("--dry-run")
const env = (name) => {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`${name} is not set.`)
  return v
}

const s3 = new S3Client({
  region: env("SPACES_REGION"),
  endpoint: env("SPACES_ENDPOINT"),
  credentials: { accessKeyId: env("SPACES_ACCESS_KEY_ID"), secretAccessKey: env("SPACES_SECRET_ACCESS_KEY") },
})
const bucket = env("SPACES_BUCKET")
const cdnBase =
  process.env.SPACES_CDN_URL?.trim().replace(/\/$/, "") ||
  `https://${bucket}.${env("SPACES_REGION")}.cdn.digitaloceanspaces.com`

const url = env("DATABASE_URL")
const client = new pg.Client({
  connectionString: url,
  ssl: /sslmode=disable/i.test(url) ? false : url.includes("sslmode=") ? { rejectUnauthorized: false } : false,
})
await client.connect()

await client.query(`create table if not exists inline_image_backup (
  id serial primary key,
  table_name text not null,
  column_name text not null,
  row_id text not null,
  data_url text not null,
  new_url text not null,
  created_at timestamptz not null default now()
)`)

let moved = 0
for (const t of TARGETS) {
  const { rows } = await client.query(
    `select id::text as id, "${t.column}" as value from "${t.table}" where "${t.column}" like 'data:image/%'`,
  )
  for (const row of rows) {
    const comma = row.value.indexOf(",")
    if (comma < 0 || !row.value.slice(0, comma).includes(";base64")) continue
    const input = Buffer.from(row.value.slice(comma + 1), "base64")
    const output = await sharp(input).rotate().resize({ width: t.width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
    const key = `${t.folder}/${randomUUID()}.webp`
    const newUrl = `${cdnBase}/${key}`
    console.log(`${t.table}.${t.column} #${row.id}: ${Math.round(input.length / 1024)}KB -> ${Math.round(output.length / 1024)}KB`)
    if (dryRun) continue

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: output,
        ContentType: "image/webp",
        ACL: "public-read",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    )
    await client.query("begin")
    await client.query(
      "insert into inline_image_backup (table_name, column_name, row_id, data_url, new_url) values ($1, $2, $3, $4, $5)",
      [t.table, t.column, row.id, row.value, newUrl],
    )
    await client.query(`update "${t.table}" set "${t.column}" = $1 where id::text = $2`, [newUrl, row.id])
    await client.query("commit")
    moved++
  }
}

console.log(dryRun ? "Dry run complete." : `Moved ${moved} inline images to Spaces.`)
await client.end()

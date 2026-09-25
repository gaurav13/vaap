// Scans app/ for public static pages and writes lib/core-routes.generated.json.
// Runs before `dev` and `build`, so any new page added to the codebase shows up
// in the sitemap and the admin "Core pages" list without manual editing.
import { readdirSync, statSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

const root = process.cwd()
const appDir = join(root, "app")
const outFile = join(root, "lib", "core-routes.generated.json")

// Private/app-only areas that must never appear as public core pages.
const EXCLUDED_TOP = new Set([
  "admin",
  "dashboard",
  "api",
  "actions",
  "p",
  "sign-in",
  "sign-up",
  "forgot-password",
  "reset-password",
])

const PAGE_FILES = new Set(["page.tsx", "page.ts", "page.jsx", "page.js", "page.mdx"])

function walk(dir, found) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name.startsWith("_") || name.startsWith("@")) continue
      walk(full, found)
    } else if (PAGE_FILES.has(name)) {
      found.push(dir)
    }
  }
}

const dirs = []
walk(appDir, dirs)

const routes = new Set()
for (const dir of dirs) {
  const segments = relative(appDir, dir)
    .split(sep)
    .filter(Boolean)
    .filter((s) => !(s.startsWith("(") && s.endsWith(")")))
  if (segments.some((s) => s.includes("["))) continue
  if (segments.length && EXCLUDED_TOP.has(segments[0])) continue
  routes.add("/" + segments.join("/"))
}

const sorted = [...routes].sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)))
writeFileSync(outFile, JSON.stringify(sorted, null, 2) + "\n")
console.log(`[core-routes] ${sorted.length} public pages written to lib/core-routes.generated.json`)

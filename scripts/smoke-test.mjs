#!/usr/bin/env node
// Read-only smoke + regression checks. Safe to run against production:
// it only issues GET requests and never submits forms or payments.
//
//   node scripts/smoke-test.mjs                       # http://localhost:3000
//   BASE_URL=https://vaap.org.pk node scripts/smoke-test.mjs
//   REF_CODE=VAAP-ADNAN-004 BASE_URL=... node scripts/smoke-test.mjs

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "")
const REF = process.env.REF_CODE || "VAAP-ADNAN-004"
const MAX_PAGES = Number(process.env.MAX_PAGES || 150)

const failures = []
const pass = (m) => console.log(`  ok   ${m}`)
const fail = (m) => {
  failures.push(m)
  console.log(`  FAIL ${m}`)
}

async function get(path, opts = {}) {
  return fetch(path.startsWith("http") ? path : BASE + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
    ...opts,
  })
}

async function referralChecks() {
  console.log("\nReferral system")
  const join = await get(`/join?ref=${encodeURIComponent(REF)}`)
  const loc = join.headers.get("location") || ""
  const cookie = join.headers.get("set-cookie") || ""
  join.status === 307 ? pass("/join returns 307") : fail(`/join status ${join.status}`)
  ;/localhost|127\.0\.0\.1/.test(loc) && !BASE.includes("localhost")
    ? fail(`/join redirect leaks localhost: ${loc}`)
    : pass(`/join redirect target ${loc}`)
  loc.includes(`ref=${REF}`) ? pass("ref preserved in redirect") : fail(`ref missing from redirect (${loc}) — is ${REF} an active code?`)
  cookie.includes(`vaap_ref=${REF}`) ? pass("attribution cookie set by /join") : fail("attribution cookie not set by /join")

  const bogus = await get("/join?ref=NOT-A-REAL-CODE-XYZ")
  !(bogus.headers.get("set-cookie") || "").includes("vaap_ref=")
    ? pass("unknown code does not set cookie")
    : fail("unknown code set a cookie")

  const direct = await get(`/membership/apply?ref=${encodeURIComponent(REF)}`)
  direct.status === 200 ? pass("/membership/apply?ref loads") : fail(`/membership/apply status ${direct.status}`)
  ;(direct.headers.get("set-cookie") || "").includes(`vaap_ref=${REF}`)
    ? pass("direct apply link captures ref")
    : fail("direct apply link did not capture ref")
}

async function accessChecks() {
  console.log("\nAccess control (signed out)")
  for (const p of ["/admin", "/admin/payments", "/admin/members", "/admin/notifications", "/member", "/kol"]) {
    const r = await get(p)
    const loc = r.headers.get("location") || ""
    if (r.status >= 300 && r.status < 400) pass(`${p} redirects (${loc || r.status})`)
    else if (r.status === 401 || r.status === 403 || r.status === 404) pass(`${p} blocked (${r.status})`)
    else {
      const body = await r.text()
      ;(/sign in|log in|login/i).test(body) && !/Total revenue|Payment history/i.test(body)
        ? pass(`${p} renders sign-in`)
        : fail(`${p} returned ${r.status} without redirect for anonymous user`)
    }
  }
}

async function linkCrawl() {
  console.log("\nBroken-link crawl")
  const origin = new URL(BASE).origin
  const queue = ["/"]
  const seen = new Set(queue)
  const broken = []
  let crawled = 0
  try {
    const sm = await get("/sitemap.xml")
    if (sm.ok) for (const m of (await sm.text()).matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const p = new URL(m[1]).pathname
      if (!seen.has(p)) seen.add(p), queue.push(p)
    }
  } catch {}

  while (queue.length && crawled < MAX_PAGES) {
    const path = queue.shift()
    crawled++
    let res
    try {
      res = await get(path, { redirect: "follow" })
    } catch (e) {
      broken.push(`${path} (network: ${e.message})`)
      continue
    }
    if (res.status >= 400) {
      broken.push(`${path} (${res.status})`)
      continue
    }
    if (!(res.headers.get("content-type") || "").includes("text/html")) continue
    const html = await res.text()
    for (const m of html.matchAll(/href="([^"#]+)"/g)) {
      let u
      try {
        u = new URL(m[1], origin + path)
      } catch {
        continue
      }
      if (u.origin !== origin) continue
      if (/^\/(_next|api|admin|member|kol)\b/.test(u.pathname) || /\.(png|jpe?g|svg|webp|ico|css|js|pdf|xml|txt)$/.test(u.pathname)) continue
      if (!seen.has(u.pathname)) seen.add(u.pathname), queue.push(u.pathname)
    }
  }
  crawled ? pass(`crawled ${crawled} public pages`) : fail("crawler fetched nothing")
  broken.length ? broken.forEach((b) => fail(`broken link ${b}`)) : pass("no broken internal links")
}

console.log(`Smoke testing ${BASE}`)
await referralChecks()
await accessChecks()
await linkCrawl()
console.log(failures.length ? `\n${failures.length} failure(s)` : "\nAll checks passed")
process.exit(failures.length ? 1 : 0)

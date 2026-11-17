import { eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { newsletterRecipients } from "@/lib/db/schema"
import { verifyClick } from "@/lib/newsletter/engine"

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const token = params.get("r") ?? ""
  const target = params.get("u") ?? ""
  const sig = params.get("s") ?? ""

  // Only redirect to signed http(s) URLs so this can never be used as an open redirect.
  if (!/^https?:\/\//i.test(target) || !token || !sig || !verifyClick(token, target, sig)) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  await db
    .update(newsletterRecipients)
    .set({
      clickedAt: sql`coalesce(${newsletterRecipients.clickedAt}, now())`,
      openedAt: sql`coalesce(${newsletterRecipients.openedAt}, now())`,
      clickCount: sql`${newsletterRecipients.clickCount} + 1`,
    })
    .where(eq(newsletterRecipients.token, token))
    .catch(() => {})
  return NextResponse.redirect(target, 302)
}

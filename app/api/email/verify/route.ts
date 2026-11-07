import { NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { verifyToken } from "@/lib/email-tokens"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const payload = verifyToken(url.searchParams.get("token"), "verify")
  if (!payload?.id) {
    return NextResponse.redirect(new URL("/sign-in?verify=invalid", url))
  }
  // The token binds the user id to the email it was sent to, so a changed
  // address cannot be verified with an old link.
  await db
    .update(user)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(and(eq(user.id, payload.id), sql`lower(${user.email}) = ${payload.email}`))
  return NextResponse.redirect(new URL("/dashboard?verified=1", url))
}

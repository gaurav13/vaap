import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { newsletterRecipients } from "@/lib/db/schema"

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("r")
  if (token && token.length <= 64) {
    await db
      .update(newsletterRecipients)
      .set({ openedAt: new Date() })
      .where(and(eq(newsletterRecipients.token, token), isNull(newsletterRecipients.openedAt)))
      .catch(() => {})
  }
  return new Response(PIXEL, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0", "Content-Length": String(PIXEL.length) },
  })
}

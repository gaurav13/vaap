import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { and, eq, isNull } from "drizzle-orm"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import QRCode from "qrcode"
import { db } from "@/lib/db"
import { members } from "@/lib/db/schema"
import { effectiveExpiry, MEMBERSHIP_TERM_DAYS } from "@/lib/membership"

export const runtime = "nodejs"

// The certificate is drawn as vector text + a per-member QR code on top of the
// branded template raster (public/certificate-template.png, 1536x1024). Working
// in the template's native pixel coordinate system keeps the layout math simple;
// pdf-lib's origin is bottom-left, so image-Y is flipped with (H - y).
const W = 1536
const H = 1024

const GREEN = rgb(0.055, 0.235, 0.176)
const INK = rgb(0.12, 0.16, 0.2)

function fmt(d: Date | string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const id = (url.searchParams.get("id") ?? "").trim()
  if (!id) {
    return NextResponse.json({ error: "Missing membership id" }, { status: 400 })
  }

  const rows = await db
    .select()
    .from(members)
    .where(and(eq(members.membershipId, id), isNull(members.deletedAt)))
    .limit(1)
  const member = rows[0]

  if (!member || member.status !== "active") {
    return NextResponse.json({ error: "No active membership found for this ID" }, { status: 404 })
  }

  // Per-member QR: encodes a public verification link that resolves to this
  // exact membership, so every certificate carries a unique code.
  const verifyUrl = new URL(`/membership/verify?id=${encodeURIComponent(member.membershipId)}`, url.origin).toString()
  const qrPng = await QRCode.toBuffer(verifyUrl, { type: "png", width: 400, margin: 1 })

  // Load the branded template directly from the filesystem. Reading the public
  // asset from disk avoids a route handler fetching back into its own server
  // over HTTP, which is unreliable in dev and can fail in serverless/preview.
  let templateBytes: Uint8Array
  try {
    const templatePath = path.join(process.cwd(), "public", "certificate-template.png")
    templateBytes = new Uint8Array(await readFile(templatePath))
  } catch {
    return NextResponse.json({ error: "Certificate template unavailable" }, { status: 500 })
  }

  const doc = await PDFDocument.create()
  const page = doc.addPage([W, H])
  const bg = await doc.embedPng(templateBytes)
  page.drawImage(bg, { x: 0, y: 0, width: W, height: H })

  const serif = await doc.embedFont(StandardFonts.TimesRoman)
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const qr = await doc.embedPng(qrPng)

  // Draw a value left-aligned at an image-space baseline.
  const text = (
    value: string,
    x: number,
    yImg: number,
    size: number,
    font = serif,
    color = INK,
  ) => page.drawText(value, { x, y: H - yImg, size, font, color })

  // Draw a value horizontally centered on cx at an image-space baseline,
  // shrinking to fit within maxWidth.
  const centered = (value: string, cx: number, yImg: number, size: number, maxWidth: number) => {
    let s = size
    while (s > 18 && serifBold.widthOfTextAtSize(value, s) > maxWidth) s -= 1
    const w = serifBold.widthOfTextAtSize(value, s)
    page.drawText(value, { x: cx - w / 2, y: H - yImg, size: s, font: serifBold, color: GREEN })
  }

  // Member name — the headline of the certificate.
  centered(member.name, 768, 500, 52, 820)

  // Left column values, aligned under the printed labels.
  text(member.category, 272, 672, 26, serif, INK)
  // The template already prints the "VAAP-" prefix, so continue with the rest.
  text(member.membershipId.replace(/^VAAP-/i, ""), 372, 745, 28, serifBold, INK)

  // Validity period: joined — expiry (one-year / 365-day term), on either side
  // of the printed dash. Fall back to a derived one-year term if none is stored.
  const from = fmt(member.joinedAt) ?? "—"
  const to = fmt(effectiveExpiry(member.joinedAt, member.expiresAt)) ?? "Ongoing"
  text(from, 276, 820, 22, serif, INK)
  text(to, 402, 820, 22, serif, INK)
  // Explicit note that the membership term is one year.
  text(`Valid for ${MEMBERSHIP_TERM_DAYS} days from date of registration`, 272, 862, 13, serif, INK)

  // Per-member QR over the "VERIFY MEMBERSHIP" placeholder.
  page.drawImage(qr, { x: 1064, y: H - 799 - 96, width: 96, height: 96 })

  const pdf = await doc.save()
  const filename = `VAAP-Certificate-${member.membershipId}.pdf`
  const inline = url.searchParams.get("preview") === "1"

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

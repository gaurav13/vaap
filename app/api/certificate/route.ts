import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { and, eq, isNull } from "drizzle-orm"
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib"
import QRCode from "qrcode"
import { db } from "@/lib/db"
import { members } from "@/lib/db/schema"
import { getSession, isStaff } from "@/lib/session"
import { effectiveExpiry } from "@/lib/membership"
import { getCurrentCertificate, hasAnyCertificate, issueCertificate, verificationPath } from "@/lib/certificates"

export const runtime = "nodejs"

// Template raster: public/certificate-template.png (1536x1024). All coordinates
// below are in its pixel space; pdf-lib's origin is bottom-left, so y is flipped.
const W = 1536
const H = 1024

const GREEN = rgb(0.043, 0.302, 0.165)
const NAVY = rgb(0.067, 0.11, 0.271)
const GOLD = rgb(0.784, 0.541, 0.071)

function fmt(d: Date | string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fit(value: string, font: PDFFont, size: number, maxWidth: number, min = 10) {
  let s = size
  while (s > min && font.widthOfTextAtSize(value, s) > maxWidth) s -= 0.5
  return s
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const id = (url.searchParams.get("id") ?? "").trim()
  if (!id) return NextResponse.json({ error: "Missing membership id" }, { status: 400 })

  const session = await getSession()
  if (!session?.user) return NextResponse.json({ error: "Please sign in to download certificates" }, { status: 401 })
  const staff = isStaff(session.user.role)

  const member = (
    await db
      .select()
      .from(members)
      .where(and(eq(members.membershipId, id), isNull(members.deletedAt)))
      .limit(1)
  )[0]
  if (!member) return NextResponse.json({ error: "Membership not found" }, { status: 404 })

  const isOwner =
    member.userId === session.user.id || member.email.toLowerCase() === session.user.email.toLowerCase()
  if (!staff && !isOwner) return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  if (!staff && member.status !== "active") {
    return NextResponse.json({ error: "Certificates are only available for active memberships" }, { status: 403 })
  }

  // First download issues the certificate automatically. If an admin revoked
  // it, members cannot silently re-issue one — staff must regenerate it.
  let cert = await getCurrentCertificate(member.id)
  if (!cert) {
    if (!staff && (await hasAnyCertificate(member.id))) {
      return NextResponse.json(
        { error: "This certificate has been revoked. Please contact VAAP support." },
        { status: 403 },
      )
    }
    cert = await issueCertificate(member.id, staff ? session.user.email : "auto")
  }

  const verifyUrl = new URL(verificationPath(cert.token), url.origin).toString()
  const qrPng = await QRCode.toBuffer(verifyUrl, {
    type: "png",
    width: 480,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0B4D2A", light: "#FFFFFF" },
  })

  let templateBytes: Uint8Array
  try {
    templateBytes = new Uint8Array(await readFile(path.join(process.cwd(), "public", "certificate-template.png")))
  } catch {
    return NextResponse.json({ error: "Certificate template unavailable" }, { status: 500 })
  }

  const doc = await PDFDocument.create()
  doc.setTitle(`VAAP Membership Certificate – ${member.name}`)
  doc.setAuthor("Virtual Assets Alliance of Pakistan")
  const page = doc.addPage([W, H])
  page.drawImage(await doc.embedPng(templateBytes), { x: 0, y: 0, width: W, height: H })

  const serif = await doc.embedFont(StandardFonts.TimesRoman)
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const sans = await doc.embedFont(StandardFonts.Helvetica)

  const draw = (value: string, x: number, yImg: number, size: number, font: PDFFont, color = NAVY) =>
    page.drawText(value, { x, y: H - yImg, size, font, color })
  const center = (value: string, cx: number, yImg: number, size: number, font: PDFFont, color = NAVY) =>
    draw(value, cx - font.widthOfTextAtSize(value, size) / 2, yImg, size, font, color)

  // Member name on the gold rule under "This is to certify that".
  const nameSize = fit(member.name, serifBold, 48, 820, 24)
  center(member.name, 768, 486, nameSize, serifBold, GREEN)

  // Membership category on its underline.
  draw(member.category, 277, 667, fit(member.category, serifBold, 19, 208, 11), serifBold, NAVY)

  // Membership ID: the template prints "VAAP-"; continue after it.
  const idSuffix = member.membershipId.replace(/^VAAP-/i, "")
  draw(idSuffix, 349, 736, fit(idSuffix, serifBold, 24, 132, 12), serifBold, NAVY)

  // Validity period: two slots either side of the printed dash.
  const from = fmt(member.joinedAt) ?? "—"
  const to = fmt(effectiveExpiry(member.joinedAt, member.expiresAt)) ?? "Ongoing"
  center(from, 321, 806, fit(from, serif, 15, 90, 10), serif, NAVY)
  center(to, 452, 806, fit(to, serif, 15, 90, 10), serif, NAVY)

  // Verification QR in the open space beneath the signature block.
  const qrSize = 104
  const qrX = 1084
  const qrTop = 800
  page.drawRectangle({
    x: qrX - 6,
    y: H - (qrTop + qrSize + 6),
    width: qrSize + 12,
    height: qrSize + 12,
    color: rgb(1, 1, 1),
    borderColor: GOLD,
    borderWidth: 1.5,
  })
  page.drawImage(await doc.embedPng(qrPng), { x: qrX, y: H - (qrTop + qrSize), width: qrSize, height: qrSize })
  center("SCAN TO VERIFY", qrX + qrSize / 2, qrTop + qrSize + 26, 11, sansBold, GREEN)
  center(`Issued ${fmt(cert.issuedAt)}`, qrX + qrSize / 2, qrTop + qrSize + 42, 9.5, sans, NAVY)

  const pdf = await doc.save()
  const safeId = member.membershipId.replace(/[^A-Za-z0-9._-]/g, "")
  const filename = `VAAP-Certificate-${safeId || "member"}.pdf`
  const inline = url.searchParams.get("preview") === "1"

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

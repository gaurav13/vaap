"use server"

import { db } from "@/lib/db"
import { complaints } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { notify } from "@/lib/notifications"

export type ComplaintStatus = "submitted" | "review" | "guidance" | "closed"

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  submitted: "Submitted",
  review: "Under Review",
  guidance: "Guidance / Referral",
  closed: "Closed",
}

function buildCaseReference(id: number): string {
  return `VAAP-CASE-${String(id).padStart(6, "0")}`
}

export async function submitComplaint(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const phoneRaw = String(formData.get("phone") ?? "").trim()
  const category = String(formData.get("category") ?? "").trim() || "Complaint Assistance"
  const description = String(formData.get("description") ?? "").trim()

  if (!name || !email || !description) {
    return { ok: false as const, error: "Please fill in your name, email and a description." }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "Please enter a valid email address." }
  }
  if (description.length > 1000) {
    return { ok: false as const, error: "Description must be 1000 characters or fewer." }
  }

  const phone = phoneRaw ? (phoneRaw.startsWith("+") ? phoneRaw : `+92 ${phoneRaw}`) : null

  try {
    const [inserted] = await db
      .insert(complaints)
      .values({ name, email, phone, category, description, status: "submitted" })
      .returning({ id: complaints.id })

    const reference = buildCaseReference(inserted.id)
    await db.update(complaints).set({ reference }).where(eq(complaints.id, inserted.id))

    // Acknowledge to the complainant and alert the support team. Never block on this.
    await notify({
      email,
      type: "info",
      title: "We received your complaint",
      body: `Thank you, ${name}. Your case reference is ${reference}. Our team will review it and respond.`,
      emailTemplate: {
        subject: `Your VAAP case reference ${reference}`,
        heading: "We've received your submission",
        intro: [
          `Thank you for contacting the VAAP Member Support & Grievance Centre regarding "${category}".`,
          `Your case reference is ${reference}. Please keep it — you can use it any time to track your case status.`,
          "Our team reviews every submission and will guide you or refer the matter to the relevant authority where needed.",
        ],
        footnote:
          "VAAP is an industry association and does not have regulatory, investigative or enforcement powers. Matters involving unlicensed providers, fraud or regulatory violations may be referred to PVARA or other competent authorities.",
      },
    })
    await notify({
      role: "staff",
      type: "info",
      title: "New support case",
      body: `${name} submitted a "${category}" case (${reference}).`,
      link: "/admin/messages",
    })

    revalidatePath("/support")
    return { ok: true as const, reference }
  } catch {
    return { ok: false as const, error: "We couldn't submit your complaint. Please try again." }
  }
}

export type TrackResult = {
  reference: string
  category: string
  status: ComplaintStatus
  statusLabel: string
  statusNote: string | null
  submittedAt: string
  updatedAt: string
}

export async function trackComplaint(formData: FormData): Promise<
  { ok: true; result: TrackResult } | { ok: false; error: string }
> {
  const referenceRaw = String(formData.get("reference") ?? "").trim().toUpperCase()
  if (!referenceRaw) {
    return { ok: false, error: "Please enter your case reference." }
  }

  // Accept the full reference or just the numeric portion.
  const digits = referenceRaw.replace(/[^0-9]/g, "")
  const reference = digits ? buildCaseReference(Number.parseInt(digits, 10)) : referenceRaw

  try {
    const [row] = await db.select().from(complaints).where(eq(complaints.reference, reference)).limit(1)
    if (!row) {
      return { ok: false, error: "No case found with that reference. Please check and try again." }
    }
    const status = (row.status as ComplaintStatus) ?? "submitted"
    return {
      ok: true,
      result: {
        reference: row.reference ?? reference,
        category: row.category,
        status,
        statusLabel: STATUS_LABEL[status] ?? "Submitted",
        statusNote: row.statusNote ?? null,
        submittedAt: new Date(row.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        updatedAt: new Date(row.updatedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      },
    }
  } catch {
    return { ok: false, error: "We couldn't look up your case right now. Please try again." }
  }
}

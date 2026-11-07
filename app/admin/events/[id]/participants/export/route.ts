import writeXlsxFile from "write-excel-file/node"
import { getEventParticipants } from "@/app/actions/event-participants"

const STATUS_LABEL: Record<string, string> = { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled" }

// Prefix formula-like values so spreadsheets don't execute them.
function safeText(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

function csvCell(value: string) {
  return `"${safeText(value).replace(/"/g, '""')}"`
}

function fmt(date: Date | null) {
  return date ? date.toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) : ""
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const eventId = Number(id)
  if (!Number.isInteger(eventId) || eventId <= 0) return new Response("Not found", { status: 404 })

  const url = new URL(req.url)
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv"
  const status = url.searchParams.get("status")

  let data
  try {
    data = await getEventParticipants(eventId)
  } catch {
    return new Response("Forbidden", { status: 403 })
  }
  if (!data) return new Response("Not found", { status: 404 })

  const participants = status && STATUS_LABEL[status] ? data.participants.filter((p) => p.status === status) : data.participants
  const header = ["Name", "Email", "Organization", "Status", "Type", "Registered", "Email verified", "Checked in"]
  const rows = participants.map((p) => [
    p.name,
    p.email,
    p.organization,
    STATUS_LABEL[p.status] ?? p.status,
    p.userId ? "Member" : "Guest",
    fmt(p.createdAt),
    p.verifiedAt ? fmt(p.verifiedAt) : p.status === "confirmed" ? "Confirmed by staff" : "",
    fmt(p.checkedInAt),
  ])

  const base = `${data.event.slug || `event-${data.event.id}`}-participants${status && STATUS_LABEL[status] ? `-${status}` : ""}`
  const headers = { "Cache-Control": "no-store" }

  if (format === "xlsx") {
    const sheet = [
      header.map((value) => ({ value, fontWeight: "bold" as const })),
      ...rows.map((r) => r.map((value) => ({ value: safeText(value), type: String }))),
    ]
    const buffer = await writeXlsxFile(sheet, {
      sheet: "Participants",
      columns: [{ width: 26 }, { width: 32 }, { width: 26 }, { width: 12 }, { width: 10 }, { width: 22 }, { width: 22 }, { width: 22 }],
      stickyRowsCount: 1,
    }).toBuffer()
    return new Response(new Uint8Array(buffer), {
      headers: {
        ...headers,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      },
    })
  }

  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")
  return new Response(`\uFEFF${csv}`, {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.csv"`,
    },
  })
}

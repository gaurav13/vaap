import { getEventParticipants } from "@/app/actions/event-participants"

function csvCell(value: string) {
  // Prefix formula-like values so spreadsheets don't execute them.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const eventId = Number(id)
  if (!Number.isInteger(eventId) || eventId <= 0) return new Response("Not found", { status: 404 })

  let data
  try {
    data = await getEventParticipants(eventId)
  } catch {
    return new Response("Forbidden", { status: 403 })
  }
  if (!data) return new Response("Not found", { status: 404 })

  const rows = [
    ["Name", "Email", "Type", "Registered", "Checked in"],
    ...data.participants.map((p) => [
      p.name,
      p.email,
      p.userId ? "Member" : "Guest",
      p.createdAt.toISOString(),
      p.checkedInAt ? p.checkedInAt.toISOString() : "",
    ]),
  ]
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n")
  const filename = `${data.event.slug || `event-${data.event.id}`}-participants.csv`

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

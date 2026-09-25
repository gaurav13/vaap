import { getSession } from "@/lib/session"
import { getProposalDocument } from "@/lib/proposal-extras"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) {
    return Response.json({ error: "Sign in to download proposal documents." }, { status: 401 })
  }

  const { id } = await params
  const doc = await getProposalDocument(Number(id))
  if (!doc) return Response.json({ error: "Document not found." }, { status: 404 })

  const inline = new URL(request.url).searchParams.get("view") === "1"
  const upstream = await fetch(doc.fileUrl)
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "The document could not be retrieved." }, { status: 502 })
  }

  const safeName = (doc.fileName || `${doc.title}.${doc.fileType}`).replace(/["\\\r\n]/g, "_")
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  })
  const length = upstream.headers.get("content-length")
  if (length) headers.set("Content-Length", length)
  return new Response(upstream.body, { headers })
}

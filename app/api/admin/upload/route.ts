import { getSession, isStaff } from "@/lib/session"
import { uploadPageImage } from "@/lib/spaces"
import { isSameOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin uploads are rejected." }, { status: 403 })
  }

  const session = await getSession()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isStaff(session.user.role)) {
    return Response.json({ error: "Only staff can upload page images." }, { status: 403 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: "Upload could not be read." }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an image to upload." }, { status: 400 })
  }

  const folder = String(form.get("folder") ?? "pages")
  try {
    const url = await uploadPageImage({
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
      folder,
      fileName: file.name,
    })
    return Response.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed."
    return Response.json({ error: message }, { status: 400 })
  }
}

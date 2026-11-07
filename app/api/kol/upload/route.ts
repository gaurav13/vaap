import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { members } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { uploadPageImage, uploadPrivateDocument } from "@/lib/spaces"
import { isSameOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-origin uploads are rejected." }, { status: 403 })
  const session = await getSession()
  if (!session?.user) return Response.json({ error: "Please sign in to upload." }, { status: 401 })

  const [member] = await db
    .select({ id: members.id, status: members.status })
    .from(members)
    .where(and(eq(members.userId, session.user.id), isNull(members.deletedAt)))
    .limit(1)
  if (!member || member.status !== "active") {
    return Response.json({ error: "Only active members can upload KOL documents." }, { status: 403 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: "Upload could not be read." }, { status: 400 })
  }
  const file = form.get("file")
  if (!(file instanceof File)) return Response.json({ error: "Choose a file to upload." }, { status: 400 })
  const bytes = new Uint8Array(await file.arrayBuffer())

  try {
    if (form.get("kind") === "evidence") {
      const { key } = await uploadPrivateDocument({ bytes, fileName: file.name, folder: `kol-evidence/${member.id}` })
      return Response.json({ url: key, key, name: file.name })
    }
    const url = await uploadPageImage({ bytes, contentType: file.type, folder: "kol", fileName: file.name })
    return Response.json({ url })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 })
  }
}

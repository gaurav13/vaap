import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { governanceProposalDocuments } from "@/lib/db/schema"
import { getSession, isStaff } from "@/lib/session"
import { uploadProposalDocument } from "@/lib/spaces"
import { getProposal, logGovernance } from "@/lib/governance"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (!isStaff(session.user.role)) {
    return Response.json({ error: "Only administrators can upload proposal documents." }, { status: 403 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: "Upload could not be read." }, { status: 400 })
  }

  const proposalId = Number(form.get("proposalId"))
  const file = form.get("file")
  const title = String(form.get("title") ?? "").trim().slice(0, 200)
  const description = String(form.get("description") ?? "").trim().slice(0, 500)

  if (!Number.isInteger(proposalId) || !(await getProposal(proposalId))) {
    return Response.json({ error: "Proposal not found." }, { status: 404 })
  }
  if (!(file instanceof File)) return Response.json({ error: "Choose a file to upload." }, { status: 400 })

  try {
    const uploaded = await uploadProposalDocument({
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
      fileName: file.name,
    })
    const [doc] = await db
      .insert(governanceProposalDocuments)
      .values({
        proposalId,
        title: title || file.name.replace(/\.[^.]+$/, ""),
        description,
        fileUrl: uploaded.url,
        fileName: file.name.slice(0, 255),
        fileType: uploaded.extension,
        fileSize: file.size,
        uploadedById: session.user.id,
        uploadedByName: session.user.name ?? "",
      })
      .returning()

    await logGovernance({
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role,
      action: "proposal_document_uploaded",
      entityType: "proposal",
      entityId: proposalId,
      detail: { documentId: doc.id, title: doc.title, fileName: doc.fileName },
    })
    revalidatePath(`/admin/governance/${proposalId}`)
    revalidatePath(`/voting/proposals/${proposalId}`)
    return Response.json({ document: doc })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed."
    return Response.json({ error: message }, { status: 400 })
  }
}

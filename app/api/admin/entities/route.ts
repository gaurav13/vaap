import { NextResponse } from "next/server"
import { saveEntity, deleteEntity, reorderEntity } from "@/app/actions/cms"
import { ENTITIES, type EntityKey } from "@/lib/cms/entities"

function parseTarget(url: string) {
  const { searchParams } = new URL(url)
  const entity = searchParams.get("entity") ?? ""
  const rawId = searchParams.get("id")
  if (!Object.hasOwn(ENTITIES, entity)) return null
  const id = rawId ? Number(rawId) : null
  if (id !== null && (!Number.isInteger(id) || id <= 0)) return null
  return { entity: entity as EntityKey, id }
}

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Request failed."
  const status = /Unauthorized|Forbidden/.test(message) ? 401 : 500
  return NextResponse.json(
    { ok: false, error: status === 401 ? "Your admin session has expired. Sign in again and retry." : message },
    { status },
  )
}

export async function POST(request: Request) {
  const target = parseTarget(request.url)
  if (!target) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 })
  try {
    const formData = await request.formData()
    const res = await saveEntity(target.entity, target.id, formData)
    return NextResponse.json(res ?? { ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function PATCH(request: Request) {
  const target = parseTarget(request.url)
  if (!target) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 })
  try {
    const body = (await request.json().catch(() => null)) as { ids?: unknown } | null
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : []
    const res = await reorderEntity(target.entity, ids)
    return NextResponse.json(res, { status: res.ok ? 200 : 400 })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function DELETE(request: Request) {
  const target = parseTarget(request.url)
  if (!target || target.id === null) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 })
  try {
    await deleteEntity(target.entity, target.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}

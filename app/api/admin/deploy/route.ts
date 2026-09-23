import { getSession, isAdmin } from "@/lib/session"
import { db } from "@/lib/db"
import { auditLogs } from "@/lib/db/schema"
import { acquireDeployLock, releaseDeployLock, runDeploy, type DeployEvent } from "@/lib/deploy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Cross-origin deploy requests are rejected." }, { status: 403 })
  }

  const session = await getSession()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdmin(session.user.role)) {
    return Response.json({ error: "Only a Super Admin can deploy." }, { status: 403 })
  }

  if (!acquireDeployLock()) {
    return Response.json({ error: "A deploy is already running." }, { status: 409 })
  }

  try {
    await db.insert(auditLogs).values({
      actorId: session.user.id,
      actorName: session.user.name ?? "",
      action: "deploy.start",
      target: "main",
    })
  } catch {
    // A failed audit write must not block the deploy.
  }

  const encoder = new TextEncoder()
  let released = false
  const release = () => {
    if (released) return
    released = true
    releaseDeployLock()
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: DeployEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // The browser disconnected. The deploy keeps running on the server.
        }
      }
      try {
        await runDeploy(send)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Deploy failed"
        send({ type: "log", stream: "stderr", text: `${message}\n` })
        send({ type: "done", ok: false, message })
      } finally {
        release()
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

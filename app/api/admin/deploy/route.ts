import { getSession, isAdmin } from "@/lib/session"
import { db } from "@/lib/db"
import { auditLogs } from "@/lib/db/schema"
import { acquireDeployLock, releaseDeployLock, runDeploy, type DeployEvent } from "@/lib/deploy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TRUSTED_HOSTS = new Set(
  [
    "https://vaap.org.pk",
    "https://www.vaap.org.pk",
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].flatMap((url) => {
    if (!url) return []
    try {
      return [new URL(url).host]
    } catch {
      return []
    }
  }),
)

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim().toLowerCase() || null
}

// Reverse proxies (nginx in front of PM2) often forward Host as localhost:3000,
// so a plain Origin-vs-Host comparison rejects legitimate same-site clicks.
function sameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "same-origin") return true

  const origin = request.headers.get("origin")
  if (!origin) return false
  let originHost: string
  try {
    originHost = new URL(origin).host.toLowerCase()
  } catch {
    return false
  }

  if (TRUSTED_HOSTS.has(originHost)) return true

  const hosts = [
    firstHeaderValue(request.headers.get("x-forwarded-host")),
    firstHeaderValue(request.headers.get("host")),
  ]
  return hosts.includes(originHost)
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

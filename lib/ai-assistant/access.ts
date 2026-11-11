import "server-only"

import { getSession } from "@/lib/session"

export type AssistantAuthState = "signed_out" | "unverified"

export type AssistantViewer = { id: string; name: string; email: string }

export type AssistantAccess =
  | { ok: true; viewer: AssistantViewer }
  | { ok: false; state: AssistantAuthState; status: 401 | 403; message: string }

/**
 * Ask VAAP AI is only available to signed-in users whose email address is verified.
 * Checked on the server for every AI request, before any question is counted or any AI cost is incurred.
 */
export async function getAssistantAccess(): Promise<AssistantAccess> {
  const session = await getSession().catch(() => null)
  const user = session?.user as (AssistantViewer & { emailVerified?: boolean }) | undefined
  if (!user?.id) {
    return { ok: false, state: "signed_out", status: 401, message: "Please sign in to use Ask VAAP AI." }
  }
  if (!user.emailVerified) {
    return {
      ok: false,
      state: "unverified",
      status: 403,
      message: "Please verify your email address to use Ask VAAP AI. Check your inbox for the verification link.",
    }
  }
  return { ok: true, viewer: { id: user.id, name: user.name, email: user.email } }
}

export function accessDenied(access: Extract<AssistantAccess, { ok: false }>) {
  return Response.json(
    { error: access.state, message: access.message },
    { status: access.status, headers: { "Cache-Control": "no-store" } },
  )
}

"use client"

import { useActionState } from "react"
import { CheckCircle2 } from "lucide-react"
import { requestKolCollaboration } from "@/app/actions/kol"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type State = { ok: boolean; message?: string; error?: string } | null

export function CollaborationForm({ slug, name }: { slug: string; name: string }) {
  const [state, action, pending] = useActionState<State, FormData>(async (_prev, formData) => {
    const res = await requestKolCollaboration(slug, formData)
    return res.ok ? { ok: true, message: res.message } : { ok: false, error: res.error }
  }, null)

  if (state?.ok) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-mint p-5 text-green" role="status">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="text-sm leading-relaxed">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-body">
        Requests are reviewed by VAAP and forwarded to {name}. Contact details are never published.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="collab-name">Your name</Label>
        <Input id="collab-name" name="name" required maxLength={120} autoComplete="name" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="collab-email">Email</Label>
        <Input id="collab-email" name="email" type="email" required maxLength={160} autoComplete="email" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="collab-org">Organization (optional)</Label>
        <Input id="collab-org" name="organization" maxLength={160} autoComplete="organization" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="collab-message">How would you like to collaborate?</Label>
        <Textarea id="collab-message" name="message" required minLength={10} maxLength={3000} rows={4} />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="bg-green text-card hover:bg-green-hover">
        {pending ? "Sending…" : "Request collaboration"}
      </Button>
    </form>
  )
}

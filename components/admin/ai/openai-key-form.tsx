"use client"

import { useActionState, useState, useTransition } from "react"
import { removeOpenAiKey, saveOpenAiKey, testOpenAiKey, type ActionResult } from "@/app/actions/ai-admin"
import { Button } from "@/components/ui/button"

function Result({ result }: { result: ActionResult | null }) {
  if (!result) return null
  return (
    <p role="status" className={result.ok ? "text-sm text-green" : "text-sm text-destructive"}>
      {result.ok ? result.message : result.error}
    </p>
  )
}

export function OpenAiKeyForm({ hasStoredKey }: { hasStoredKey: boolean }) {
  const [saveResult, save, saving] = useActionState(saveOpenAiKey, null)
  const [other, setOther] = useState<ActionResult | null>(null)
  const [busy, start] = useTransition()

  const run = (fn: () => Promise<ActionResult>) => start(async () => setOther(await fn()))

  return (
    <div className="flex flex-col gap-4">
      <form action={save} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-heading">OpenAI API key</span>
          <input
            name="apiKey"
            type="password"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-..."
            className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-heading"
          />
        </label>
        <div>
          <Button type="submit" disabled={saving || busy}>
            {saving ? "Saving and testing..." : "Save and test"}
          </Button>
        </div>
        <Result result={saveResult} />
      </form>

      {hasStoredKey ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy || saving} onClick={() => run(testOpenAiKey)}>
              {busy ? "Working..." : "Test connection"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || saving}
              onClick={() => {
                if (confirm("Remove the saved OpenAI key? OpenAI models will go through Vercel AI Gateway instead.")) run(removeOpenAiKey)
              }}
            >
              Remove key
            </Button>
          </div>
          <Result result={other} />
        </div>
      ) : null}
    </div>
  )
}

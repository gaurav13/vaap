"use client"

import { useRef, useState } from "react"
import { Loader2, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"

type LogLine = { id: number; stream: "stdout" | "stderr"; text: string }
type DeployEvent =
  | { type: "step"; index: number; total: number; name: string }
  | { type: "log"; stream: "stdout" | "stderr"; text: string }
  | { type: "done"; ok: boolean; message: string }

export function DeployPanel() {
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState<{ index: number; total: number; name: string } | null>(null)
  const [lines, setLines] = useState<LogLine[]>([])
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const lineId = useRef(0)
  const logRef = useRef<HTMLPreElement>(null)
  const busy = useRef(false)

  function pushLine(stream: "stdout" | "stderr", text: string) {
    const id = ++lineId.current
    setLines((current) => [...current, { id, stream, text }])
    queueMicrotask(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    })
  }

  async function onDeploy() {
    if (busy.current) return
    busy.current = true
    setRunning(true)
    setResult(null)
    setStep(null)
    setLines([])

    try {
      const response = await fetch("/api/admin/deploy", { method: "POST" })
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setResult({ ok: false, message: payload?.error || "Deploy could not be started." })
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split("\n\n")
        buffer = chunks.pop() ?? ""
        for (const chunk of chunks) {
          const data = chunk
            .split("\n")
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.slice(6))
            .join("\n")
          if (!data) continue
          const event = JSON.parse(data) as DeployEvent
          if (event.type === "step") setStep({ index: event.index, total: event.total, name: event.name })
          if (event.type === "log") pushLine(event.stream, event.text)
          if (event.type === "done") setResult({ ok: event.ok, message: event.message })
        }
      }

      setResult((current) => current ?? { ok: false, message: "Deploy ended before a result was reported." })
    } catch {
      setResult({ ok: false, message: "The deploy connection closed before it finished." })
    } finally {
      busy.current = false
      setRunning(false)
    }
  }

  const progress = step ? Math.round((step.index / step.total) * 100) : 0

  return (
    <section className="mt-6 rounded-xl border border-line bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-heading">Sync &amp; Deploy Latest Changes</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-2">
            Pulls <span className="font-medium text-heading">origin/main</span> on this server, installs dependencies,
            syncs the Drizzle schema, builds the app, and restarts PM2. Local edits on the server are discarded.
          </p>
        </div>
        <Button onClick={onDeploy} disabled={running} className="shrink-0 bg-green text-white hover:bg-green/90">
          {running ? <Loader2 className="animate-spin" /> : <Rocket />}
          {running ? "Deploying…" : "Sync & Deploy Latest Changes"}
        </Button>
      </div>

      {running && step && (
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-body">
            <span>
              Step {step.index} of {step.total}: {step.name}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-mint" aria-hidden>
            <div className="h-full rounded-full bg-green transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {result && (
        <p
          className={
            "mt-4 rounded-lg px-4 py-3 text-sm " +
            (result.ok ? "bg-mint text-navy" : "bg-destructive/10 text-destructive")
          }
        >
          {result.message}
        </p>
      )}

      {lines.length > 0 && (
        <pre
          ref={logRef}
          className="mt-4 max-h-80 overflow-auto rounded-lg bg-[#0d1f1a] p-4 text-xs leading-relaxed text-white"
        >
          {lines.map((line) => (
            <span key={line.id} className={line.stream === "stderr" ? "text-[#F4C7C3]" : "text-[#D7E7E1]"}>
              {line.text}
            </span>
          ))}
        </pre>
      )}
    </section>
  )
}

import { getProviderStatus } from "@/lib/ai-assistant/provider"
import { getAiSettings } from "@/lib/ai-assistant/settings"
import { dateTime } from "@/lib/ai-assistant/format"
import { Section, StatusBadge } from "@/components/admin/ai/ui"
import { OpenAiKeyForm } from "@/components/admin/ai/openai-key-form"

const STATUS_LABEL = {
  "not-connected": "Not connected",
  untested: "Saved, not tested",
  connected: "Connected",
  error: "Connection failed",
} as const

const STATUS_TONE = { "not-connected": "draft", untested: "pending", connected: "approved", error: "rejected" } as const

export async function ApiTab() {
  const [status, settings] = await Promise.all([getProviderStatus(), getAiSettings()])
  const usesOpenAi = settings.defaultModel.startsWith("openai/")
  const route = usesOpenAi && status.connected ? "Directly to OpenAI with your key" : "Vercel AI Gateway"

  return (
    <div className="flex flex-col gap-6">
      <Section title="OpenAI connection" description="The key is encrypted on the server and never sent to the browser.">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-2">Status</dt>
            <dd>
              <StatusBadge status={STATUS_TONE[status.status]} label={STATUS_LABEL[status.status]} />
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-2">Key</dt>
            <dd className="font-mono text-heading">{status.keyHint ?? "None"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-2">Model in use</dt>
            <dd className="font-mono text-heading">{settings.defaultModel}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-2">Requests go</dt>
            <dd className="text-heading">{route}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-2">Last tested</dt>
            <dd className="text-heading">{status.lastTestedAt ? dateTime(status.lastTestedAt) : "Never"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-2">Last changed</dt>
            <dd className="text-heading">{status.updatedAt ? dateTime(status.updatedAt) : "—"}</dd>
          </div>
        </dl>

        {status.status === "error" && status.lastError ? (
          <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive">
            {status.lastError}
          </p>
        ) : null}
        {!usesOpenAi ? (
          <p className="mt-4 text-sm leading-relaxed text-muted-2">
            The default model is not an OpenAI model, so this key is not used. Choose an OpenAI model under Budget &amp; Models to use it.
          </p>
        ) : null}
      </Section>

      <Section
        title={status.keyHint && status.keyHint !== "environment variable" ? "Replace API key" : "Add API key"}
        description="Create a key at platform.openai.com/api-keys. Saving runs a connection test straight away."
      >
        <OpenAiKeyForm hasStoredKey={Boolean(status.updatedAt)} />
      </Section>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { ArrowLeft, ArrowRight, Check, Save, Send } from "lucide-react"
import {
  previewAudienceReport,
  renderCampaignPreview,
  saveCampaign,
  scheduleCampaign,
  sendCampaignTest,
} from "@/app/actions/newsletters"
import { createSendFromTemplate, saveEmailTemplate, sendTemplateTest } from "@/app/actions/custom-email-templates"
import type { AudienceReport } from "@/lib/newsletter/audience"
import { describeSelection, EMAIL_RE, type AudienceSelection, type CampaignContent } from "@/lib/newsletter/content"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { AudiencePicker } from "./audience-picker"
import { ContentEditor } from "./content-editor"
import { PreviewPane } from "./preview-pane"
import { RecipientReview } from "./recipient-review"
import { Btn, Field, fmtDate, inputCls, Notice, type ComposerMode, type Draft, type Msg } from "./shared"

const STEPS = ["Create content", "Select audience", "Review recipients", "Preview email", "Send or schedule"]

const toLocalInput = (iso: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function CampaignComposer({
  mode,
  initial,
  plans,
  canSend,
  onClose,
  onUseTemplate,
}: {
  mode: ComposerMode
  initial: Draft
  plans: string[]
  canSend: boolean
  onClose: (msg?: Msg) => void
  onUseTemplate?: (draft: Draft) => void
}) {
  const [id, setId] = useState(initial.id)
  const [name, setName] = useState(initial.name)
  const [content, setContent] = useState<CampaignContent>(initial.content)
  const [audience, setAudience] = useState<AudienceSelection>(initial.audience)
  const [isMarketing, setIsMarketing] = useState(mode === "newsletter" ? true : initial.isMarketing)
  const [step, setStep] = useState(0)
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, start] = useTransition()

  const [report, setReport] = useState<AudienceReport | null>(null)
  const [reportError, setReportError] = useState("")
  const [counting, startCount] = useTransition()

  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null)
  const [previewError, setPreviewError] = useState("")
  const [rendering, startRender] = useTransition()

  const [testEmail, setTestEmail] = useState("")
  const [when, setWhen] = useState<"now" | "later">(initial.scheduledAt ? "later" : "now")
  const [scheduleAt, setScheduleAt] = useState(toLocalInput(initial.scheduledAt))
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isTemplate = mode === "template"
  const noun = mode === "newsletter" ? "newsletter" : isTemplate ? "template" : "email"
  const input = { content, audience, isMarketing }

  const patchContent = (p: Partial<CampaignContent>) => {
    setContent((c) => ({ ...c, ...p }))
    setPreview(null)
  }
  const changeAudience = (a: AudienceSelection) => {
    setAudience(a)
    setReport(null)
  }
  const changeMarketing = (v: boolean) => {
    setIsMarketing(v)
    setReport(null)
    setPreview(null)
  }

  const runReport = () =>
    startCount(async () => {
      const res = await previewAudienceReport(audience, isMarketing)
      if (res.ok) {
        setReport(res.report)
        setReportError("")
      } else setReportError(res.error)
    })
  const runPreview = () =>
    startRender(async () => {
      const res = await renderCampaignPreview(content, isMarketing)
      if (res.ok) {
        setPreview({ html: res.html, subject: res.subject })
        setPreviewError("")
      } else setPreviewError(res.error)
    })

  const contentError = () => {
    if (isTemplate && !name.trim()) return "Give the template a name."
    if (!content.title.trim()) return `Add a ${noun === "template" ? "email" : noun} title.`
    return ""
  }

  const goTo = (n: number) => {
    if (n > 0) {
      const err = contentError()
      if (err) {
        setStep(0)
        setMsg({ tone: "error", text: err })
        return
      }
    }
    setMsg(null)
    setStep(n)
    if ((n === 2 || n === 4) && !report) runReport()
    if (n === 3 && !preview) runPreview()
  }

  async function persist(): Promise<number | null> {
    const err = contentError()
    if (err) {
      setMsg({ tone: "error", text: err })
      return null
    }
    const res = isTemplate ? await saveEmailTemplate(id, name, input) : await saveCampaign(id, mode, input)
    if (!res.ok) {
      setMsg({ tone: "error", text: res.error })
      return null
    }
    setId(res.id)
    return res.id
  }

  const saveDraft = () =>
    start(async () => {
      const saved = await persist()
      if (saved) setMsg({ tone: "ok", text: isTemplate ? "Template saved." : "Draft saved." })
    })

  const sendTest = () =>
    start(async () => {
      if (!EMAIL_RE.test(testEmail.trim())) {
        setMsg({ tone: "error", text: "Enter a valid email address for the test." })
        return
      }
      const saved = await persist()
      if (!saved) return
      const res = isTemplate ? await sendTemplateTest(saved, testEmail) : await sendCampaignTest(saved, testEmail)
      setMsg(res.ok ? { tone: "ok", text: `Test sent to ${testEmail.trim()}.` } : { tone: "error", text: res.error })
    })

  const openConfirm = () => {
    if (when === "later" && (!scheduleAt || new Date(scheduleAt).getTime() <= Date.now())) {
      setMsg({ tone: "error", text: "Choose a future date and time to schedule." })
      return
    }
    setMsg(null)
    runReport()
    setConfirmOpen(true)
  }

  const confirmSend = () =>
    start(async () => {
      const saved = await persist()
      if (!saved) return setConfirmOpen(false)
      const res = await scheduleCampaign(saved, when === "later" ? new Date(scheduleAt).toISOString() : null)
      setConfirmOpen(false)
      if (!res.ok) return setMsg({ tone: "error", text: res.error })
      onClose({
        tone: "ok",
        text:
          when === "later"
            ? `Scheduled for ${fmtDate(new Date(scheduleAt).toISOString())} to ${res.recipients.toLocaleString()} recipients.`
            : `Sending started to ${res.recipients.toLocaleString()} recipients.`,
      })
    })

  const useTemplate = () =>
    start(async () => {
      const saved = await persist()
      if (!saved) return
      const res = await createSendFromTemplate(saved)
      if (!res.ok) return setMsg({ tone: "error", text: res.error })
      onUseTemplate?.({ id: res.campaignId, status: "draft", name: "", content, audience, isMarketing, scheduledAt: null })
    })

  const lastStep = STEPS.length - 1

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-line bg-card p-4 sm:p-6" aria-labelledby="composer-title">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => onClose()} className="flex w-fit items-center gap-1 text-xs font-semibold text-muted-2 hover:text-heading">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to list
          </button>
          <h2 id="composer-title" className="text-balance font-serif text-xl font-bold text-heading">
            {initial.id ? `Edit ${noun}` : `New ${noun}`}
            {content.title && <span className="font-sans text-base font-normal text-muted-2">{` — ${content.title}`}</span>}
          </h2>
          {initial.status === "scheduled" && (
            <p className="text-xs text-muted-2">Scheduled for {fmtDate(initial.scheduledAt)}. Saving keeps the schedule{canSend ? "" : " only after an Admin re-approves it"}.</p>
          )}
        </div>
        <Btn variant="secondary" onClick={saveDraft} disabled={pending}>
          <Save className="size-4" aria-hidden="true" />
          {isTemplate ? "Save template" : "Save draft"}
        </Btn>
      </header>

      <nav aria-label="Steps">
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <li key={s} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={step === i ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  step === i ? "border-green bg-green text-primary-foreground" : i < step ? "border-green/40 bg-mint text-green" : "border-line text-body hover:bg-surface",
                )}
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-card/30 text-[11px]">{i < step ? <Check className="size-3" aria-hidden="true" /> : i + 1}</span>
                {isTemplate && i === lastStep ? "Test & use" : s}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <Notice msg={msg} />

      <div>
        {step === 0 && (
          <div className="flex flex-col gap-6">
            {isTemplate && (
              <Field label="Template name" htmlFor="t-name" hint="Internal name — recipients never see it.">
                <input id="t-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
              </Field>
            )}
            <ContentEditor content={content} onChange={patchContent} titleLabel={mode === "newsletter" ? "Newsletter title" : "Email title"} />
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-6">
            {mode !== "newsletter" ? (
              <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-4">
                <legend className="px-1 text-sm font-semibold text-heading">Email type</legend>
                {(
                  [
                    [true, "Marketing / promotional", "Respects unsubscribes and marketing consent. Includes an unsubscribe link."],
                    [false, "Service / account notice", "For essential messages such as renewals or payment reminders. Only skips undeliverable addresses."],
                  ] as const
                ).map(([v, label, hint]) => (
                  <label key={label} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-surface">
                    <input type="radio" name="email-type" checked={isMarketing === v} onChange={() => changeMarketing(v)} className="mt-1 accent-green" />
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-heading">{label}</span>
                      <span className="text-xs leading-relaxed text-muted-2">{hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <p className="rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed text-body">
                Newsletters are marketing emails: anyone who unsubscribed or has not consented is skipped automatically.
              </p>
            )}
            <AudiencePicker
              value={audience}
              onChange={changeAudience}
              plans={plans}
              canSearch={canSend}
              heading={mode === "newsletter" ? "Select Newsletter Recipients" : "Select Email Recipients"}
            />
          </div>
        )}

        {step === 2 && (
          <RecipientReview
            report={report}
            loading={counting}
            error={reportError}
            audience={audience}
            isMarketing={isMarketing}
            canViewList={canSend}
            onRefresh={runReport}
          />
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <PreviewPane html={preview?.html ?? null} subject={preview?.subject ?? content.subject ?? content.title} previewText={content.previewText} loading={rendering} error={previewError} />
            <Btn variant="secondary" className="w-fit" onClick={runPreview} disabled={rendering}>
              Refresh preview
            </Btn>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 rounded-xl border border-line p-4">
              <h3 className="text-sm font-semibold text-heading">Send a test email</h3>
              {canSend ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input className={inputCls} type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" aria-label="Test email address" />
                  <Btn variant="secondary" onClick={sendTest} disabled={pending || !testEmail.trim()} className="shrink-0">
                    Send test
                  </Btn>
                </div>
              ) : (
                <p className="text-xs text-muted-2">Only Admins can send test emails. Use the preview step to check the design.</p>
              )}
            </div>

            {isTemplate ? (
              <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
                <h3 className="text-sm font-semibold text-heading">Use this template</h3>
                <p className="text-sm leading-relaxed text-body">
                  Creates a new email draft from this template with the same content and audience. You can adjust it and then send or schedule it. The template stays unchanged.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={useTemplate} disabled={pending}>
                    <Send className="size-4" aria-hidden="true" />
                    Create email from template
                  </Btn>
                  <Btn variant="secondary" onClick={saveDraft} disabled={pending}>
                    Save template
                  </Btn>
                </div>
              </div>
            ) : canSend ? (
              <div className="flex flex-col gap-4 rounded-xl border border-line p-4">
                <h3 className="text-sm font-semibold text-heading">When should it go out?</h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                  <label className="flex items-center gap-2 text-sm text-heading">
                    <input type="radio" name="when" checked={when === "now"} onChange={() => setWhen("now")} className="accent-green" />
                    Send now
                  </label>
                  <label className="flex items-center gap-2 text-sm text-heading">
                    <input type="radio" name="when" checked={when === "later"} onChange={() => setWhen("later")} className="accent-green" />
                    Schedule for later
                  </label>
                </div>
                {when === "later" && (
                  <Field label="Date and time" htmlFor="sched-at" hint="Uses your local time zone.">
                    <input id="sched-at" type="datetime-local" className={cn(inputCls, "sm:w-72")} value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                  </Field>
                )}
                <Btn onClick={openConfirm} disabled={pending} className="w-fit">
                  <Send className="size-4" aria-hidden="true" />
                  {when === "now" ? "Review and send" : "Review and schedule"}
                </Btn>
              </div>
            ) : (
              <p className="rounded-xl border border-line p-4 text-sm leading-relaxed text-body">
                Save your draft. An Admin will review it and send or schedule it.
              </p>
            )}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <Btn variant="ghost" onClick={() => goTo(step - 1)} disabled={step === 0}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Btn>
        {step < lastStep && (
          <Btn onClick={() => goTo(step + 1)}>
            Next: {STEPS[step + 1]}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Btn>
        )}
      </footer>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{when === "now" ? "Send this email now?" : "Schedule this email?"}</DialogTitle>
            <DialogDescription>Check the details below. Once sending starts it cannot be undone.</DialogDescription>
          </DialogHeader>
          <dl className="mt-4 flex flex-col divide-y divide-line text-sm">
            {(
              [
                ["Title", content.title],
                ["Subject", content.subject || content.title],
                ["Type", isMarketing ? "Marketing" : "Service notice"],
                ["Audience", describeSelection(audience)],
                ["Final recipients", counting || !report ? "Counting…" : report.final.toLocaleString()],
                ["When", when === "now" ? "Immediately" : fmtDate(scheduleAt ? new Date(scheduleAt).toISOString() : null)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-muted-2">{k}</dt>
                <dd className="text-right font-semibold text-heading">{v}</dd>
              </div>
            ))}
          </dl>
          {report && report.final === 0 && <p className="mt-3 text-sm text-destructive">There are no eligible recipients for this selection.</p>}
          <div className="mt-6 flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={confirmSend} disabled={pending || counting || !report || report.final === 0}>
              {pending ? "Working…" : when === "now" ? "Confirm and send" : "Confirm schedule"}
            </Btn>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

"use client"

import { useState } from "react"
import { AlertTriangle, Download, ExternalLink, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DEFAULT_ADJUST,
  PLATFORMS,
  categoryLabel,
  getCategory,
  platformLabel,
  preservesWholeImage,
  type ImageAdjust,
} from "@/lib/social-agent/config"
import { approvePost, deletePost, markPublished, publishNow, regenerateCaptions, rejectPost, updatePost } from "@/app/actions/social-agent"
import { Notice, StatusBadge, useAgentAction } from "./ui"

export type AgentPost = {
  id: number
  category: string
  sourceTitle: string
  sourceUrl: string
  fields: Record<string, string>
  bannerUrl: string
  variants: Record<string, string>
  captions: Record<string, string>
  platforms: string[]
  issues: string[]
  status: string
  videoUrl: string
  scheduledAt: string | null
  publishedAt: string | null
  publishedLinks: Record<string, string>
  publishErrors: Record<string, string>
  imageAdjust: Record<string, { fit: string; zoom: number; x: number; y: number }>
  reviewNote: string
  updatedAt: string
}

type PublishResult = { published: string[]; failed: string[]; manual: string[]; done: boolean }

function publishSummary(r: PublishResult | null) {
  if (!r) return "No platforms are connected yet, so publish it by hand and mark it as published."
  const parts = []
  if (r.published.length) parts.push(`Published to ${r.published.map(platformLabel).join(", ")}.`)
  if (r.failed.length) parts.push(`Failed on ${r.failed.map(platformLabel).join(", ")}; see the errors below.`)
  if (r.manual.length) parts.push(`${r.manual.map(platformLabel).join(", ")} not connected; post by hand.`)
  return parts.join(" ") || "Nothing left to publish."
}

const FIT_OPTIONS: { value: ImageAdjust["fit"]; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "preserve", label: "Show whole image" },
  { value: "fill", label: "Fill frame" },
]

function ImageAdjustControls({
  idPrefix,
  preserve,
  value,
  onChange,
}: {
  idPrefix: string
  preserve: boolean
  value: ImageAdjust
  onChange: (v: ImageAdjust) => void
}) {
  const slider = (key: "zoom" | "x" | "y", label: string, min: number, max: number) => (
    <div className="flex items-center gap-2">
      <Label htmlFor={`${idPrefix}-${key}`} className="w-16 shrink-0 text-xs font-normal">{label}</Label>
      <input
        id={`${idPrefix}-${key}`}
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
        className="w-full accent-[var(--green)]"
      />
      <span className="w-10 text-right font-mono text-xs text-muted-2">{value[key].toFixed(2)}</span>
    </div>
  )
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-2">
      <div role="radiogroup" aria-label="Image fit" className="flex flex-wrap gap-1">
        {FIT_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value.fit === o.value}
            onClick={() => onChange({ ...value, fit: o.value })}
            className={`rounded px-2 py-1 text-xs font-medium ${value.fit === o.value ? "bg-green text-primary-foreground" : "border border-line bg-card text-body"}`}
          >
            {o.label}
          </button>
        ))}
        <button type="button" onClick={() => onChange(DEFAULT_ADJUST)} className="ml-auto px-2 py-1 text-xs text-muted-2 hover:text-heading">
          Reset
        </button>
      </div>
      {value.fit === "auto" && (
        <p className="text-xs text-muted-2">
          {preserve
            ? "Newspaper-safe: the whole clipping stays visible with a blurred backdrop, never cropped."
            : "Smart crop with no stretching; switches to whole-image when cropping would cut too much."}
        </p>
      )}
      {slider("zoom", "Zoom", 1, 3)}
      {slider("x", "Left/right", -1, 1)}
      {slider("y", "Up/down", -1, 1)}
    </div>
  )
}

export function PostCard({ post, defaultOpen = false }: { post: AgentPost; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [fields, setFields] = useState(post.fields)
  const [captions, setCaptions] = useState(post.captions)
  const [platforms, setPlatforms] = useState(post.platforms)
  const [videoUrl, setVideoUrl] = useState(post.videoUrl)
  const [scheduleAt, setScheduleAt] = useState("")
  const [links, setLinks] = useState<Record<string, string>>(post.publishedLinks)
  const [adjust, setAdjust] = useState<Record<string, ImageAdjust>>((post.imageAdjust ?? {}) as Record<string, ImageAdjust>)
  const { pending, message, run } = useAgentAction()
  const category = getCategory(post.category)
  const editable = post.status !== "published" && post.status !== "publishing"
  const canPublish = post.status === "approved" || post.status === "scheduled"
  const id = (s: string) => `post-${post.id}-${s}`

  return (
    <article id={`post-${post.id}`} className="overflow-hidden rounded-lg border border-line bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-surface"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.bannerUrl || "/placeholder.svg"} alt="" className="h-14 w-24 shrink-0 rounded border border-line bg-muted object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-heading">{post.sourceTitle}</p>
          <p className="text-xs text-muted-2">
            {categoryLabel(post.category)} · {post.platforms.map(platformLabel).join(", ")}
            {post.scheduledAt && ` · Scheduled ${new Date(post.scheduledAt).toLocaleString("en-GB")}`}
          </p>
        </div>
        {post.issues.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
            <AlertTriangle className="size-4" aria-hidden="true" /> {post.issues.length}
          </span>
        )}
        <StatusBadge status={post.status} />
      </button>

      {open && (
        <div className="flex flex-col gap-5 border-t border-line p-4">
          {post.issues.length > 0 && (
            <div role="alert" className="rounded-md border border-warning/30 bg-warning-bg p-3 text-sm text-warning">
              <p className="font-semibold">Flagged for review. This post can&apos;t be approved until these are fixed:</p>
              <ul className="mt-1 list-disc pl-5">{post.issues.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          )}
          {post.reviewNote && <p className="text-sm text-muted-2">Review note: {post.reviewNote}</p>}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.bannerUrl || "/placeholder.svg"} alt={`Generated banner for ${post.sourceTitle}`} className="w-full rounded-md border border-line" />
              <div className="flex flex-wrap gap-2">
                <a href={post.bannerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-medium text-body hover:border-green">
                  <Download className="size-3.5" aria-hidden="true" /> Master
                </a>
                {Object.entries(post.variants).map(([p, url]) => (
                  <a key={p} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-medium text-body hover:border-green">
                    <Download className="size-3.5" aria-hidden="true" /> {platformLabel(p)}
                  </a>
                ))}
                <a href={post.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-green hover:underline">
                  Source <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
            <fieldset className="flex flex-col gap-2" disabled={!editable}>
              <legend className="mb-1 text-sm font-semibold text-heading">Banner content (from the approved record)</legend>
              {category?.fields.map((f) => (
                <div key={f.key} className="flex flex-col gap-1">
                  <Label htmlFor={id(f.key)} className="text-xs">{f.label}</Label>
                  <Input id={id(f.key)} value={fields[f.key] ?? ""} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} placeholder={f.kind === "image" ? "Image URL" : undefined} />
                  {f.kind === "image" && fields[f.key] ? (
                    <ImageAdjustControls
                      idPrefix={id(`adj-${f.key}`)}
                      preserve={preservesWholeImage(post.category, f.key)}
                      value={adjust[f.key] ?? DEFAULT_ADJUST}
                      onChange={(v) => setAdjust({ ...adjust, [f.key]: v })}
                    />
                  ) : null}
                </div>
              ))}
              <p className="text-xs text-muted-2">Adjust the image, then Save changes to re-render every platform size.</p>
            </fieldset>
          </div>

          <fieldset className="flex flex-col gap-3" disabled={!editable}>
            <legend className="mb-1 text-sm font-semibold text-heading">Platforms and captions</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {PLATFORMS.map((p) => (
                <Label key={p.key} className="flex items-center gap-2 font-normal">
                  <Checkbox checked={platforms.includes(p.key)} onCheckedChange={(v) => setPlatforms(v === true ? [...platforms, p.key] : platforms.filter((x) => x !== p.key))} />
                  {p.label}
                </Label>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {PLATFORMS.filter((p) => platforms.includes(p.key)).map((p) => (
                <div key={p.key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={id(`cap-${p.key}`)}>{p.label}</Label>
                    <span className={`text-xs ${(captions[p.key]?.length ?? 0) > p.captionLimit ? "text-destructive" : "text-muted-2"}`}>
                      {captions[p.key]?.length ?? 0}/{p.captionLimit}
                    </span>
                  </div>
                  <Textarea id={id(`cap-${p.key}`)} rows={5} value={captions[p.key] ?? ""} onChange={(e) => setCaptions({ ...captions, [p.key]: e.target.value })} />
                  {"needsVideo" in p && !videoUrl && <p className="text-xs text-warning">{p.label} needs a video. Attach one below or publish the banner as a still.</p>}
                </div>
              ))}
            </div>
            {platforms.some((p) => PLATFORMS.find((x) => x.key === p && "needsVideo" in x)) && (
              <div className="flex flex-col gap-1">
                <Label htmlFor={id("video")}>Video URL (TikTok / YouTube)</Label>
                <Input id={id("video")} type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
              </div>
            )}
          </fieldset>

          <Notice message={message} />

          {editable && (
            <div className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => updatePost({ id: post.id, fields, captions, platforms, videoUrl, imageAdjust: adjust }), (r) => ("issues" in r && (r.issues as string[]).length ? "Saved. Some issues remain." : "Saved and re-rendered."))}>
                Save changes
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => regenerateCaptions(post.id), "Captions regenerated.")}>
                Regenerate captions
              </Button>
              <div className="flex flex-col gap-1">
                <Label htmlFor={id("schedule")} className="text-xs">Schedule (optional)</Label>
                <Input id={id("schedule")} type="datetime-local" className="h-9" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
              </div>
              <Button size="sm" disabled={pending || post.issues.length > 0} onClick={() => run(() => approvePost({ id: post.id, scheduledAt: scheduleAt ? new Date(scheduleAt).toISOString() : null }), (r) => scheduleAt ? "Approved and scheduled. It will publish automatically at that time." : `Approved. ${publishSummary("publish" in r ? (r.publish as PublishResult | null) : null)}`)}>
                {scheduleAt ? "Approve and schedule" : "Approve"}
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => { const note = prompt("Reason for rejection (optional)") ; if (note !== null) run(() => rejectPost({ id: post.id, note }), "Rejected.") }}>
                Reject
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" disabled={pending} onClick={() => confirm("Delete this draft?") && run(() => deletePost(post.id), "Deleted.")}>
                Delete
              </Button>
            </div>
          )}

          {canPublish && (
            <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
              <p className="text-sm text-body">
                Connected platforms publish automatically. For any platform that is not connected or failed, post the banner by hand and paste
                the live link below.
              </p>
              {Object.entries(post.publishErrors ?? {}).filter(([p]) => post.platforms.includes(p)).length > 0 && (
                <ul role="alert" className="flex flex-col gap-1 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                  {Object.entries(post.publishErrors)
                    .filter(([p]) => post.platforms.includes(p))
                    .map(([p, e]) => (
                      <li key={p}>
                        <span className="font-semibold">{platformLabel(p)}:</span> {e}
                      </li>
                    ))}
                </ul>
              )}
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                disabled={pending}
                onClick={() => run(() => publishNow(post.id), (r) => publishSummary("publish" in r ? (r.publish as PublishResult) : null))}
              >
                <Send className="size-4" aria-hidden="true" /> Publish to connected platforms now
              </Button>
              <div className="grid gap-2 md:grid-cols-2">
                {post.platforms.map((p) => (
                  <div key={p} className="flex flex-col gap-1">
                    <Label htmlFor={id(`link-${p}`)} className="text-xs">{platformLabel(p)} post link</Label>
                    <Input id={id(`link-${p}`)} type="url" value={links[p] ?? ""} onChange={(e) => setLinks({ ...links, [p]: e.target.value })} placeholder="https://…" />
                  </div>
                ))}
              </div>
              <Button size="sm" className="self-start" disabled={pending} onClick={() => run(() => markPublished({ id: post.id, links }), "Marked as published.")}>
                Mark as published
              </Button>
            </div>
          )}

          {post.status === "published" && Object.keys(post.publishedLinks).length > 0 && (
            <ul className="flex flex-wrap gap-3 text-sm">
              {Object.entries(post.publishedLinks).map(([p, url]) => (
                <li key={p}>
                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-green hover:underline">
                    {platformLabel(p)} <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  )
}

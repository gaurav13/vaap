"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ImageIcon, Plus, Trash2, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { getCategory, type TemplateLayer } from "@/lib/social-agent/config"
import { activateTemplate, previewTemplate, replaceTemplateImage, saveTemplateLayout } from "@/app/actions/social-agent"
import { Notice, selectClass, useAgentAction } from "./ui"

export type EditorTemplate = {
  id: number
  category: string
  name: string
  imageUrl: string
  width: number
  height: number
  layers: TemplateLayer[]
  active: boolean
}

type Drag = { id: string; mode: "move" | "resize"; startX: number; startY: number; orig: TemplateLayer }

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))

export function TemplateEditor({ template, records }: { template: EditorTemplate; records: { id: string; title: string }[] }) {
  const category = getCategory(template.category)!
  const [name, setName] = useState(template.name)
  const [layers, setLayers] = useState<TemplateLayer[]>(template.layers)
  const [selected, setSelected] = useState<string | null>(template.layers[0]?.id ?? null)
  const [preview, setPreview] = useState<{ url: string; issues: string[] } | null>(null)
  const [sourceId, setSourceId] = useState("")
  const canvas = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const { pending, message, run } = useAgentAction()

  const layer = layers.find((l) => l.id === selected) ?? null
  const scale = canvas.current ? canvas.current.clientWidth / template.width : 1
  const update = (id: string, patch: Partial<TemplateLayer>) => setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))

  function addLayer(kind: "text" | "image") {
    const field = category.fields.find((f) => f.kind === kind && !layers.some((l) => l.field === f.key)) ?? category.fields.find((f) => f.kind === kind)
    if (!field) return
    const l: TemplateLayer = {
      id: Math.random().toString(36).slice(2, 10),
      field: field.key,
      kind,
      x: 0.1,
      y: 0.1,
      w: kind === "image" ? 0.25 : 0.5,
      h: kind === "image" ? 0.3 : 0.1,
      fontSize: Math.round(template.height * 0.045),
      weight: "bold",
      color: "#ffffff",
      align: "left",
      maxLines: kind === "text" ? 2 : 0,
      maxChars: 0,
      uppercase: false,
      fit: kind === "image" && field.key.toLowerCase().includes("logo") ? "contain" : "cover",
      shape: "rect",
    }
    setLayers((ls) => [...ls, l])
    setSelected(l.id)
  }

  function onPointerDown(e: React.PointerEvent, l: TemplateLayer, mode: Drag["mode"]) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelected(l.id)
    drag.current = { id: l.id, mode, startX: e.clientX, startY: e.clientY, orig: l }
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    const el = canvas.current
    if (!d || !el) return
    const dx = (e.clientX - d.startX) / el.clientWidth
    const dy = (e.clientY - d.startY) / el.clientHeight
    if (d.mode === "move") update(d.id, { x: clamp(d.orig.x + dx, 0, 1 - d.orig.w), y: clamp(d.orig.y + dy, 0, 1 - d.orig.h) })
    else update(d.id, { w: clamp(d.orig.w + dx, 0.02, 1 - d.orig.x), h: clamp(d.orig.h + dy, 0.02, 1 - d.orig.y) })
  }
  const endDrag = () => (drag.current = null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/social-agent?tab=templates" className="inline-flex items-center gap-1 text-sm font-medium text-green hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> All templates
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => previewTemplate({ id: template.id, layers, sourceId: sourceId || undefined }), undefined, (r) => "dataUrl" in r && setPreview({ url: r.dataUrl as string, issues: r.issues as string[] }))}>
            Test render
          </Button>
          <Button size="sm" disabled={pending} onClick={() => run(() => saveTemplateLayout({ id: template.id, name, layers }), "Template saved.")}>
            Save layout
          </Button>
          {!template.active && (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => activateTemplate(template.id), "Template activated for this category.")}>
              Set as active
            </Button>
          )}
        </div>
      </div>
      <Notice message={message} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-2">
            {template.width}×{template.height}px · {category.label} · Drag an area to move it, drag its corner to resize. The banner design itself is never changed.
          </p>
          <div
            ref={canvas}
            className="relative w-full touch-none select-none overflow-hidden rounded-lg border border-line bg-muted"
            style={{ aspectRatio: `${template.width} / ${template.height}` }}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerDown={() => setSelected(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={template.imageUrl} alt={`${name} banner design`} className="absolute inset-0 size-full" draggable={false} />
            {layers.map((l) => (
              <div
                key={l.id}
                role="button"
                tabIndex={0}
                aria-label={`${category.fields.find((f) => f.key === l.field)?.label ?? l.field} area`}
                onPointerDown={(e) => onPointerDown(e, l, "move")}
                onKeyDown={(e) => e.key === "Enter" && setSelected(l.id)}
                className={cn(
                  "absolute flex cursor-move items-start border-2 border-dashed text-left",
                  l.shape === "circle" && "rounded-full",
                  selected === l.id ? "border-gold bg-gold/15" : "border-primary-foreground/80 bg-navy/20",
                )}
                style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, width: `${l.w * 100}%`, height: `${l.h * 100}%` }}
              >
                <span className="m-1 rounded bg-navy px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                  {category.fields.find((f) => f.key === l.field)?.label ?? l.field}
                </span>
                <span
                  aria-hidden="true"
                  onPointerDown={(e) => onPointerDown(e, l, "resize")}
                  className="absolute -bottom-1.5 -right-1.5 size-3.5 cursor-nwse-resize rounded-sm border-2 border-navy bg-gold"
                />
              </div>
            ))}
          </div>
          {preview && (
            <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
              <p className="text-sm font-semibold text-heading">Test render{sourceId ? "" : " (sample text)"}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url || "/placeholder.svg"} alt="Rendered banner preview" className="w-full rounded-md border border-line" />
              {preview.issues.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-warning">
                  {preview.issues.map((i) => <li key={i}>{i}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-green">All content fits the template.</p>
              )}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4 rounded-lg border border-line bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpl-name">Template name</Label>
            <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpl-record">Test with record</Label>
            <select id="tpl-record" className={selectClass} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              <option value="">Sample text</option>
              {records.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => addLayer("text")}>
              <Type className="size-4" aria-hidden="true" /> Text area
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => addLayer("image")}>
              <ImageIcon className="size-4" aria-hidden="true" /> Image area
            </Button>
          </div>

          {layer ? (
            <LayerProperties layer={layer} categoryKey={template.category} scale={scale} onChange={(p) => update(layer.id, p)} onDelete={() => { setLayers((ls) => ls.filter((l) => l.id !== layer.id)); setSelected(null) }} />
          ) : (
            <p className="text-sm text-muted-2">{layers.length ? "Select an area to edit its settings." : "Add text and image areas where record data should appear."}</p>
          )}

          <form
            className="flex flex-col gap-1.5 border-t border-line pt-4"
            action={(fd) => run(() => replaceTemplateImage(fd), "Banner image replaced. Content areas were kept.")}
          >
            <input type="hidden" name="id" value={template.id} />
            <Label htmlFor="tpl-replace">Replace banner image</Label>
            <Input id="tpl-replace" name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
            <Button type="submit" variant="outline" size="sm" disabled={pending}>
              <Plus className="size-4" aria-hidden="true" /> Upload replacement
            </Button>
          </form>
        </aside>
      </div>
    </div>
  )
}

function LayerProperties({
  layer,
  categoryKey,
  onChange,
  onDelete,
}: {
  layer: TemplateLayer
  categoryKey: string
  scale: number
  onChange: (p: Partial<TemplateLayer>) => void
  onDelete: () => void
}) {
  const fields = getCategory(categoryKey)!.fields.filter((f) => f.kind === layer.kind)
  const num = (v: string, fallback: number) => (Number.isFinite(Number(v)) ? Number(v) : fallback)
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="layer-field">Data field</Label>
        <select id="layer-field" className={selectClass} value={layer.field} onChange={(e) => onChange({ field: e.target.value })}>
          {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </div>
      {layer.kind === "text" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="layer-size">Font size (px)</Label>
              <Input id="layer-size" type="number" min={6} max={400} value={layer.fontSize} onChange={(e) => onChange({ fontSize: num(e.target.value, layer.fontSize) })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="layer-color">Color</Label>
              <Input id="layer-color" type="color" value={layer.color.length === 7 ? layer.color : "#ffffff"} onChange={(e) => onChange({ color: e.target.value })} className="h-9 p-1" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="layer-weight">Weight</Label>
              <select id="layer-weight" className={selectClass} value={layer.weight} onChange={(e) => onChange({ weight: e.target.value as TemplateLayer["weight"] })}>
                <option value="normal">Regular</option>
                <option value="bold">Bold</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="layer-align">Alignment</Label>
              <select id="layer-align" className={selectClass} value={layer.align} onChange={(e) => onChange({ align: e.target.value as TemplateLayer["align"] })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="layer-lines">Max lines</Label>
              <Input id="layer-lines" type="number" min={0} max={20} value={layer.maxLines} onChange={(e) => onChange({ maxLines: num(e.target.value, 0) })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="layer-chars">Max characters</Label>
              <Input id="layer-chars" type="number" min={0} max={2000} value={layer.maxChars} onChange={(e) => onChange({ maxChars: num(e.target.value, 0) })} />
            </div>
          </div>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={layer.uppercase} onCheckedChange={(v) => onChange({ uppercase: v === true })} /> Uppercase
          </Label>
          <p className="text-xs text-muted-2">0 means no limit. Content that exceeds a limit or its area is flagged for review instead of shrinking the design.</p>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="layer-fit">Fit</Label>
            <select id="layer-fit" className={selectClass} value={layer.fit} onChange={(e) => onChange({ fit: e.target.value as TemplateLayer["fit"] })}>
              <option value="cover">Fill (smart crop)</option>
              <option value="contain">Fit whole image</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="layer-shape">Shape</Label>
            <select id="layer-shape" className={selectClass} value={layer.shape} onChange={(e) => onChange({ shape: e.target.value as TemplateLayer["shape"] })}>
              <option value="rect">Rectangle</option>
              <option value="circle">Circle</option>
            </select>
          </div>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive">
        <Trash2 className="size-4" aria-hidden="true" /> Remove area
      </Button>
    </div>
  )
}

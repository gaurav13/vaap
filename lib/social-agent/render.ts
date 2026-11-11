import "server-only"
import { readFile } from "node:fs/promises"
import path from "node:path"
import sharp, { type OverlayOptions } from "sharp"
import { DEFAULT_ADJUST, PLATFORMS, getCategory, preservesWholeImage, type ImageAdjust, type TemplateLayer } from "@/lib/social-agent/config"

const FONT_FILE = path.join(process.cwd(), "lib/social-agent/fonts/Inter.ttf")
const MAX_REMOTE_BYTES = 12 * 1024 * 1024

type Template = { imageUrl: string; width: number; height: number; layers: TemplateLayer[]; category: string }

/** Loads an image from an absolute URL or a site-relative /public path. */
export async function loadImage(src: string): Promise<Buffer> {
  if (src.startsWith("/") && !src.startsWith("//")) {
    const file = path.join(process.cwd(), "public", path.normalize(src).replace(/^(\.\.[/\\])+/, ""))
    if (!file.startsWith(path.join(process.cwd(), "public"))) throw new Error("Invalid image path")
    return readFile(file)
  }
  const url = new URL(src)
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported image URL")
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "follow" })
  if (!res.ok) throw new Error(`Image request failed (${res.status})`)
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.byteLength > MAX_REMOTE_BYTES) throw new Error("Image is too large")
  return bytes
}

const escapeMarkup = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const safeColor = (c: string) => (/^#[0-9a-f]{3,8}$/i.test(c) ? c : "#ffffff")

function box(layer: TemplateLayer, t: Template) {
  const left = Math.max(0, Math.round(layer.x * t.width))
  const top = Math.max(0, Math.round(layer.y * t.height))
  const width = Math.max(1, Math.min(t.width - left, Math.round(layer.w * t.width)))
  const height = Math.max(1, Math.min(t.height - top, Math.round(layer.h * t.height)))
  return { left, top, width, height }
}

async function renderText(layer: TemplateLayer, value: string, b: ReturnType<typeof box>, label: string, issues: string[]) {
  let text = value.replace(/\s+/g, " ").trim()
  if (layer.maxChars > 0 && text.length > layer.maxChars) {
    issues.push(`${label} is ${text.length} characters; the template allows ${layer.maxChars}.`)
    text = `${text.slice(0, Math.max(1, layer.maxChars - 1)).trimEnd()}…`
  }
  if (layer.uppercase) text = text.toUpperCase()
  const markup = `<span foreground="${safeColor(layer.color)}" font_weight="${layer.weight === "bold" ? "bold" : "normal"}">${escapeMarkup(text)}</span>`
  const rendered = await sharp({
    text: {
      text: markup,
      font: `Inter ${Math.max(6, Math.round(layer.fontSize))}px`,
      fontfile: FONT_FILE,
      width: b.width,
      align: layer.align,
      rgba: true,
      dpi: 72,
      wrap: "word",
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true })

  const lineHeight = layer.fontSize * 1.21
  const lines = Math.round(rendered.info.height / lineHeight)
  if (rendered.info.height > b.height + 2 || (layer.maxLines > 0 && lines > layer.maxLines)) {
    issues.push(`${label} does not fit its area (${lines} line${lines === 1 ? "" : "s"}). Shorten the text or adjust the template.`)
  }
  const height = Math.min(rendered.info.height, b.height)
  const width = Math.min(rendered.info.width, b.width)
  const input = await sharp(rendered.data).extract({ left: 0, top: 0, width, height }).png().toBuffer()
  // Pango aligns inside its own (possibly narrower) output, so place it within the box horizontally.
  const offset = layer.align === "center" ? Math.round((b.width - width) / 2) : layer.align === "right" ? b.width - width : 0
  return { input, left: b.left + offset, top: b.top }
}

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 }
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0))

/**
 * Proportional placement: scales to fit (or fill) the area, then applies zoom and pan.
 * Never stretches; anything outside the area is clipped only when the Super Admin zooms or picks "fill".
 */
async function placeImage(input: Buffer, b: ReturnType<typeof box>, mode: "preserve" | "contain" | "cover", adj: ImageAdjust) {
  const meta = await sharp(input).metadata()
  const sw = meta.width ?? 1
  const sh = meta.height ?? 1
  const base = mode === "cover" ? Math.max(b.width / sw, b.height / sh) : Math.min(b.width / sw, b.height / sh)
  const scale = base * clamp(adj.zoom, 1, 3)
  const rw = Math.max(1, Math.round(sw * scale))
  const rh = Math.max(1, Math.round(sh * scale))
  const left = Math.round(((b.width - rw) * (1 + clamp(adj.x, -1, 1))) / 2)
  const top = Math.round(((b.height - rh) * (1 + clamp(adj.y, -1, 1))) / 2)
  const cropL = Math.max(0, -left)
  const cropT = Math.max(0, -top)
  const visW = Math.min(rw - cropL, b.width - Math.max(0, left))
  const visH = Math.min(rh - cropT, b.height - Math.max(0, top))
  const piece = await sharp(input).resize(rw, rh, { fit: "fill" }).extract({ left: cropL, top: cropT, width: visW, height: visH }).png().toBuffer()
  const buffer = await sharp({ create: { width: b.width, height: b.height, channels: 4, background: mode === "contain" ? CLEAR : WHITE } })
    .composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer()
  return { buffer, clipped: visW < rw || visH < rh }
}

async function renderImage(
  layer: TemplateLayer,
  src: string,
  b: ReturnType<typeof box>,
  opts: { preserve: boolean; adjust?: ImageAdjust; label: string; issues: string[] },
) {
  let source = await sharp(await loadImage(src), { failOn: "none" }).rotate().toBuffer()
  const adj = { ...DEFAULT_ADJUST, ...opts.adjust }
  const mode = adj.fit === "preserve" ? "preserve" : adj.fit === "fill" ? "cover" : opts.preserve || layer.fit === "preserve" ? "preserve" : layer.fit
  let img: ReturnType<typeof sharp>

  if (mode === "preserve") {
    // Strip scanner margins around a clipping so the article itself gets the space; keep the original if trimming fails.
    source = await sharp(source).trim({ threshold: 18 }).toBuffer().catch(() => source)
    const { buffer, clipped } = await placeImage(source, b, "preserve", adj)
    if (clipped && adj.zoom <= 1) opts.issues.push(`${opts.label} could not be placed without cropping. Check the preview.`)
    img = sharp(buffer)
  } else if (adj.zoom === 1 && adj.x === 0 && adj.y === 0) {
    // "attention" cropping keeps the most salient region (faces, skin tones) inside the frame without distortion.
    img = sharp(source).resize(b.width, b.height, {
      fit: mode === "contain" ? "contain" : "cover",
      position: mode === "contain" ? "centre" : sharp.strategy.attention,
      background: CLEAR,
    })
  } else {
    img = sharp((await placeImage(source, b, mode, adj)).buffer)
  }
  img = img.ensureAlpha()
  if (layer.shape === "circle") {
    const mask = Buffer.from(
      `<svg width="${b.width}" height="${b.height}"><ellipse cx="${b.width / 2}" cy="${b.height / 2}" rx="${b.width / 2}" ry="${b.height / 2}" fill="#fff"/></svg>`,
    )
    img = sharp(await img.png().toBuffer()).composite([{ input: mask, blend: "dest-in" }])
  }
  return { input: await img.png().toBuffer(), left: b.left, top: b.top }
}

/**
 * Places record values into the template's fixed areas. The uploaded banner itself is never recolored,
 * resized or rearranged. Anything missing or overflowing is reported as an issue for Super Admin review.
 */
export async function renderBanner(template: Template, fields: Record<string, string>, adjust: Record<string, ImageAdjust> = {}) {
  const issues: string[] = []
  const cat = getCategory(template.category)
  const labelOf = (key: string) => cat?.fields.find((f) => f.key === key)?.label ?? key
  const base = await loadImage(template.imageUrl)
  const composites: OverlayOptions[] = []

  for (const layer of template.layers) {
    const value = (fields[layer.field] ?? "").trim()
    const label = labelOf(layer.field)
    if (!value) {
      issues.push(`${label} is missing for this record.`)
      continue
    }
    const b = box(layer, template)
    try {
      composites.push(
        layer.kind === "image"
          ? await renderImage(layer, value, b, { preserve: preservesWholeImage(template.category, layer.field), adjust: adjust[layer.field], label, issues })
          : await renderText(layer, value, b, label, issues),
      )
    } catch (error) {
      issues.push(`${label} could not be loaded (${error instanceof Error ? error.message : "unknown error"}).`)
    }
  }
  if (template.layers.length === 0) issues.push("This template has no content areas defined yet.")

  const banner = await sharp(base, { failOn: "none" })
    .resize(template.width, template.height, { fit: "fill" })
    .composite(composites)
    .png()
    .toBuffer()
  return { banner, issues }
}

/** Fits the finished banner into each platform's dimensions without cropping, padding with the banner's dominant colour. */
export async function renderVariants(banner: Buffer, platforms: string[]) {
  const { dominant } = await sharp(banner).stats()
  const out: Record<string, Buffer> = {}
  for (const p of PLATFORMS.filter((pl) => platforms.includes(pl.key))) {
    out[p.key] = await sharp(banner)
      .resize(p.width, p.height, { fit: "contain", background: { ...dominant, alpha: 1 } })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()
  }
  return out
}

export async function imageSize(bytes: Buffer) {
  const meta = await sharp(bytes).metadata()
  return { width: meta.autoOrient?.width ?? meta.width ?? 0, height: meta.autoOrient?.height ?? meta.height ?? 0 }
}
